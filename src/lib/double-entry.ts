import { PrismaClient } from "@prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

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

  const count = await tx.journalEntry.count();
  const entryNo = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  return tx.journalEntry.create({
    data: {
      entryNo,
      description,
      entryDate: entryDate ?? new Date(),
      referenceType,
      referenceId,
      saleId,
      purchaseId,
      createdById,
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          type: l.type,
          amount: l.amount,
          description: l.description,
          userId: l.userId,
        })),
      },
    },
    include: { lines: true },
  });
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

  const prevBalance = Number(last?.runningBalance ?? 0);
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
