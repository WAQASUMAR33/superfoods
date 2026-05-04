import { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Next JE-{year}-{seq} based on existing rows (not row count — avoids duplicates after deletes). */
async function allocateJournalEntryNo(tx: TxClient, entryDate: Date): Promise<string> {
  const year = entryDate.getFullYear();
  const prefix = `JE-${year}-`;
  const last = await tx.journalEntry.findFirst({
    where: { entryNo: { startsWith: prefix } },
    orderBy: { entryNo: "desc" },
    select: { entryNo: true },
  });
  let seq = 1;
  if (last?.entryNo.startsWith(prefix)) {
    const suffix = last.entryNo.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  if (seq > 99999) {
    return `${prefix}${Date.now().toString(36).toUpperCase()}`;
  }
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

function isJournalEntryNoUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  const t = e.meta?.target;
  if (Array.isArray(t)) return t.some((x) => String(x).includes("entryNo"));
  if (typeof t === "string") return t.includes("entryNo");
  return true;
}

export interface JournalLineInput {
  accountId: number;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description?: string;
  userId?: number;
}

export async function postJournalEntry(
  tx: TxClient,
  {
    description,
    entryDate,
    referenceType,
    referenceId,
    saleId,
    purchaseId,
    lines,
    createdById,
  }: {
    description: string;
    entryDate?: Date;
    referenceType?: string;
    referenceId?: number;
    saleId?: number;
    purchaseId?: number;
    lines: JournalLineInput[];
    createdById?: number;
  }
) {
  const totalDebits = lines.filter((l) => l.type === "DEBIT").reduce((s, l) => s + l.amount, 0);
  const totalCredits = lines.filter((l) => l.type === "CREDIT").reduce((s, l) => s + l.amount, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Journal entry unbalanced: debits=${totalDebits}, credits=${totalCredits}`);
  }

  const resolvedDate = entryDate ?? new Date();
  const lineCreates = lines.map((l) => ({
    accountId: l.accountId,
    type: l.type,
    amount: l.amount,
    description: l.description,
    userId: l.userId,
  }));

  for (let attempt = 0; attempt < 12; attempt++) {
    const entryNo = await allocateJournalEntryNo(tx, resolvedDate);
    try {
      return await tx.journalEntry.create({
        data: {
          entryNo,
          description,
          entryDate: resolvedDate,
          referenceType,
          referenceId,
          saleId,
          purchaseId,
          createdById,
          lines: { create: lineCreates },
        },
        include: { lines: true },
      });
    } catch (e) {
      if (isJournalEntryNoUniqueViolation(e) && attempt < 11) continue;
      throw e;
    }
  }

  throw new Error("Could not allocate a unique journal entry number");
}

export async function getSystemAccounts(tx: TxClient) {
  const accounts = await tx.account.findMany({ where: { isSystem: true } });
  const map: Record<string, number> = {};
  for (const a of accounts) map[a.code] = a.id;
  return map;
}

export async function updatePartyLedger(
  tx: TxClient,
  {
    customerId,
    supplierId,
    type,
    amount,
    description,
    referenceType,
    referenceId,
    saleId,
    purchaseId,
  }: {
    customerId?: number;
    supplierId?: number;
    type: "DEBIT" | "CREDIT";
    amount: number;
    description: string;
    referenceType: string;
    referenceId?: number;
    saleId?: number;
    purchaseId?: number;
  }
) {
  const whereClause = customerId ? { customerId } : { supplierId };

  const last = await tx.partyLedgerEntry.findFirst({
    where: whereClause,
    orderBy: { id: "desc" },
  });

  let prevBalance = 0;
  if (last) {
    prevBalance = Number(last.runningBalance);
  } else if (supplierId != null) {
    const s = await tx.supplier.findUnique({
      where: { id: supplierId },
      select: { openingBalance: true },
    });
    prevBalance = Number(s?.openingBalance ?? 0);
  } else if (customerId != null) {
    const c = await tx.customer.findUnique({
      where: { id: customerId },
      select: { openingBalance: true },
    });
    prevBalance = Number(c?.openingBalance ?? 0);
  }
  const delta = type === "DEBIT" ? amount : -amount;
  const runningBalance = prevBalance + delta;

  return tx.partyLedgerEntry.create({
    data: {
      customerId,
      supplierId,
      type,
      amount,
      description,
      referenceType,
      referenceId,
      saleId,
      purchaseId,
      runningBalance,
    },
  });
}
