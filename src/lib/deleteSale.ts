import type { PrismaClient } from "@prisma/client";
import { rebuildCustomerPartyLedgerRunningBalances } from "@/lib/partyBalances";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

async function deleteJournalEntriesForSale(
  tx: TxClient,
  saleId: number,
  returnIds: number[]
): Promise<void> {
  const journalEntries = await tx.journalEntry.findMany({
    where: {
      OR: [
        { saleId },
        ...(returnIds.length > 0 ? [{ saleReturnId: { in: returnIds } }] : []),
        { referenceType: "SALE", referenceId: saleId },
        ...(returnIds.length > 0
          ? [{ referenceType: "SALE_RETURN", referenceId: { in: returnIds } }]
          : []),
      ],
    },
    select: { id: true },
  });

  if (journalEntries.length === 0) return;

  const journalIds = journalEntries.map((j) => j.id);
  await tx.journalLine.deleteMany({ where: { journalEntryId: { in: journalIds } } });
  await tx.journalEntry.deleteMany({ where: { id: { in: journalIds } } });
}

/**
 * Deletes a sale and all related records: sale returns (+ items), stock movements,
 * journal entries/lines, and party ledger rows; then rebuilds customer ledger balances.
 */
export async function deleteSaleWithDependencies(tx: TxClient, saleId: number): Promise<void> {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    select: { id: true, customerId: true },
  });
  if (!sale) throw new Error("NOT_FOUND");

  const returns = await tx.saleReturn.findMany({
    where: { saleId },
    select: { id: true },
  });
  const returnIds = returns.map((r) => r.id);

  await tx.stockMovement.deleteMany({
    where: {
      OR: [
        { referenceType: "SALE", referenceId: saleId },
        ...(returnIds.length > 0
          ? [{ referenceType: "SALE_RETURN", referenceId: { in: returnIds } }]
          : []),
      ],
    },
  });

  await deleteJournalEntriesForSale(tx, saleId, returnIds);

  await tx.partyLedgerEntry.deleteMany({
    where: {
      OR: [
        { saleId },
        { referenceType: "SALE", referenceId: saleId },
        ...(returnIds.length > 0
          ? [{ referenceType: "SALE_RETURN", referenceId: { in: returnIds } }]
          : []),
      ],
    },
  });

  if (returnIds.length > 0) {
    await tx.saleReturnItem.deleteMany({
      where: { saleReturnId: { in: returnIds } },
    });
    await tx.saleReturn.deleteMany({ where: { saleId } });
  }

  await tx.saleItem.deleteMany({ where: { saleId } });
  await tx.sale.delete({ where: { id: saleId } });

  if (sale.customerId != null) {
    await rebuildCustomerPartyLedgerRunningBalances(tx, sale.customerId);
  }
}
