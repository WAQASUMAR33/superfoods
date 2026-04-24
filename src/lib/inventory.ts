import { PrismaClient } from "@prisma/client";
import { Unit } from "./units";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function recordStockMovement(
  tx: TxClient,
  {
    productId,
    type,
    quantityKg,
    displayUnit,
    displayQty,
    unitCostKg,
    referenceId,
    referenceType,
    notes,
  }: {
    productId: number;
    type: string;
    quantityKg: number;
    displayUnit: Unit;
    displayQty: number;
    unitCostKg?: number;
    referenceId?: number;
    referenceType?: string;
    notes?: string;
  }
) {
  return tx.stockMovement.create({
    data: {
      productId,
      type,
      quantityKg,
      displayUnit,
      displayQty,
      unitCostKg,
      referenceId,
      referenceType,
      notes,
    },
  });
}

export async function getStockLevel(tx: TxClient, productId: number): Promise<number> {
  const result = await tx.stockMovement.groupBy({
    by: ["type"],
    where: { productId },
    _sum: { quantityKg: true },
  });

  const inTypes = ["PURCHASE_IN", "ADJUSTMENT_IN", "RETURN_IN"];
  const outTypes = ["SALE_OUT", "ADJUSTMENT_OUT", "RETURN_OUT"];

  let totalIn = 0;
  let totalOut = 0;

  for (const r of result) {
    const qty = Number(r._sum.quantityKg ?? 0);
    if (inTypes.includes(r.type)) totalIn += qty;
    if (outTypes.includes(r.type)) totalOut += qty;
  }

  return totalIn - totalOut;
}

export async function getStockLevels(prisma: TxClient): Promise<Record<number, number>> {
  const movements = await prisma.stockMovement.groupBy({
    by: ["productId", "type"],
    _sum: { quantityKg: true },
  });

  const inTypes = ["PURCHASE_IN", "ADJUSTMENT_IN", "RETURN_IN"];
  const outTypes = ["SALE_OUT", "ADJUSTMENT_OUT", "RETURN_OUT"];
  const levels: Record<number, number> = {};

  for (const m of movements) {
    const qty = Number(m._sum.quantityKg ?? 0);
    if (!levels[m.productId]) levels[m.productId] = 0;
    if (inTypes.includes(m.type)) levels[m.productId] += qty;
    if (outTypes.includes(m.type)) levels[m.productId] -= qty;
  }

  return levels;
}

export function getStockStatus(stockKg: number, thresholdKg: number): "ok" | "low" | "critical" {
  if (stockKg <= 0) return "critical";
  if (stockKg <= thresholdKg) return "low";
  return "ok";
}
