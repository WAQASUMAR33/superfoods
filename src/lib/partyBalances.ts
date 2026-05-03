import type { PrismaClient } from "@prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Latest running balance per customer: two queries, no N× parallel pool checkouts. */
export async function lastRunningBalancesByCustomerId(
  tx: TxClient,
  customers: { id: number; openingBalance: unknown }[]
): Promise<Record<number, number>> {
  const ids = customers.map((c) => c.id);
  if (ids.length === 0) return {};

  const grouped = await tx.partyLedgerEntry.groupBy({
    by: ["customerId"],
    where: { customerId: { in: ids } },
    _max: { id: true },
  });

  const ledgerIds = grouped.map((g) => g._max.id).filter((id): id is number => id != null);
  if (ledgerIds.length === 0) {
    return Object.fromEntries(customers.map((c) => [c.id, Number(c.openingBalance)]));
  }

  const rows = await tx.partyLedgerEntry.findMany({
    where: { id: { in: ledgerIds } },
    select: { customerId: true, runningBalance: true },
  });
  const byCustomer = new Map(
    rows
      .filter((r): r is typeof r & { customerId: number } => r.customerId != null)
      .map((r) => [r.customerId, Number(r.runningBalance)])
  );

  return Object.fromEntries(
    customers.map((c) => [c.id, byCustomer.get(c.id) ?? Number(c.openingBalance)])
  );
}

/** Latest running balance per supplier: two queries. */
export async function lastRunningBalancesBySupplierId(
  tx: TxClient,
  suppliers: { id: number; openingBalance: unknown }[]
): Promise<Record<number, number>> {
  const ids = suppliers.map((s) => s.id);
  if (ids.length === 0) return {};

  const grouped = await tx.partyLedgerEntry.groupBy({
    by: ["supplierId"],
    where: { supplierId: { in: ids } },
    _max: { id: true },
  });

  const ledgerIds = grouped.map((g) => g._max.id).filter((id): id is number => id != null);
  if (ledgerIds.length === 0) {
    return Object.fromEntries(suppliers.map((s) => [s.id, Number(s.openingBalance)]));
  }

  const rows = await tx.partyLedgerEntry.findMany({
    where: { id: { in: ledgerIds } },
    select: { supplierId: true, runningBalance: true },
  });
  const bySupplier = new Map(
    rows
      .filter((r): r is typeof r & { supplierId: number } => r.supplierId != null)
      .map((r) => [r.supplierId, Number(r.runningBalance)])
  );

  return Object.fromEntries(
    suppliers.map((s) => [s.id, bySupplier.get(s.id) ?? Number(s.openingBalance)])
  );
}
