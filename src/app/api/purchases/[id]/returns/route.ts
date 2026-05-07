export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PurchaseReturnPayloadSchema } from "@/types";
import { toKg, Unit } from "@/lib/units";
import { recordStockMovement, getStockLevel } from "@/lib/inventory";
import { postJournalEntry, getSystemAccounts, updatePartyLedger } from "@/lib/double-entry";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { PrismaClient } from "@prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

async function previouslyReturnedKg(tx: TxClient, purchaseId: number, purchaseItemId: number): Promise<number> {
  const agg = await tx.purchaseReturnItem.aggregate({
    where: {
      purchaseItemId,
      purchaseReturn: { purchaseId },
    },
    _sum: { quantityKg: true },
  });
  return Number(agg._sum.quantityKg ?? 0);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as { id: string }).id);
  const purchaseId = Number((await params).id);
  if (Number.isNaN(purchaseId)) return NextResponse.json({ error: "Invalid purchase id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PurchaseReturnPayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { items: true },
      });
      if (!purchase) throw new Error("Purchase not found");

      const returnDate = data.returnDate ? new Date(data.returnDate) : new Date();

      const itemCreates: Array<{
        purchaseItemId: number;
        productId: number;
        quantityKg: number;
        displayUnit: string;
        displayQty: number;
        unitCostKg: number;
        totalCost: number;
      }> = [];

      for (const line of data.items) {
        const pi = purchase.items.find((it) => it.id === line.purchaseItemId);
        if (!pi) throw new Error(`Purchase line #${line.purchaseItemId} is not part of this purchase.`);

        const unit = pi.displayUnit as Unit;
        const returnQtyKg = toKg(line.displayQty, unit);
        if (returnQtyKg <= 0) throw new Error("Return quantity must be positive.");

        const prior = await previouslyReturnedKg(tx as TxClient, purchaseId, pi.id);
        const maxKg = Number(pi.quantityKg);
        if (prior + returnQtyKg > maxKg + 1e-6) {
          throw new Error(`Return exceeds remaining qty for purchase line #${pi.id}`);
        }

        const lineTotal = Number(((returnQtyKg / maxKg) * Number(pi.totalCost)).toFixed(2));

        itemCreates.push({
          purchaseItemId: pi.id,
          productId: pi.productId,
          quantityKg: returnQtyKg,
          displayUnit: pi.displayUnit,
          displayQty: line.displayQty,
          unitCostKg: Number(pi.unitCostKg),
          totalCost: lineTotal,
        });
      }

      const totalAmount = Number(itemCreates.reduce((s, r) => s + r.totalCost, 0).toFixed(2));

      const year = returnDate.getFullYear();
      const rc = await tx.purchaseReturn.count({
        where: { returnDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      });
      const returnNo = `PR-${year}-${String(rc + 1).padStart(5, "0")}`;

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNo,
          purchaseId,
          supplierId: purchase.supplierId,
          userId,
          returnDate,
          totalAmount,
          notes: data.notes?.trim() ? data.notes.trim() : null,
          items: {
            create: itemCreates.map((row) => ({
              purchaseItemId: row.purchaseItemId,
              productId: row.productId,
              quantityKg: row.quantityKg,
              displayUnit: row.displayUnit,
              displayQty: row.displayQty,
              unitCostKg: row.unitCostKg,
              totalCost: row.totalCost,
            })),
          },
        },
        include: { items: true },
      });

      for (const row of itemCreates) {
        const avail = await getStockLevel(tx as Parameters<typeof getStockLevel>[0], row.productId);
        if (avail + 1e-6 < row.quantityKg) {
          throw new Error(`Insufficient stock to return goods for product #${row.productId}.`);
        }

        await recordStockMovement(tx as Parameters<typeof recordStockMovement>[0], {
          productId: row.productId,
          type: "PURCHASE_RETURN_OUT",
          quantityKg: row.quantityKg,
          displayUnit: row.displayUnit as Unit,
          displayQty: row.displayQty,
          unitCostKg: row.unitCostKg,
          referenceId: purchaseReturn.id,
          referenceType: "PURCHASE_RETURN",
          notes: returnNo,
        });
      }

      const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);
      const desc = `Purchase return ${purchaseReturn.returnNo} (purchase ${purchase.internalRef ?? purchase.invoiceNo})`;

      await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
        description: desc,
        entryDate: returnDate,
        referenceType: "PURCHASE_RETURN",
        referenceId: purchaseReturn.id,
        purchaseReturnId: purchaseReturn.id,
        purchaseId: purchase.id,
        createdById: userId,
        lines: [
          { accountId: accounts["2001"], type: "DEBIT", amount: totalAmount, description: "Reduce AP" },
          { accountId: accounts["1200"], type: "CREDIT", amount: totalAmount, description: "Inventory out" },
        ],
      });

      await updatePartyLedger(tx as Parameters<typeof updatePartyLedger>[0], {
        supplierId: purchase.supplierId,
        type: "DEBIT",
        amount: totalAmount,
        description: `Purchase return ${purchaseReturn.returnNo}`,
        referenceType: "PURCHASE_RETURN",
        referenceId: purchaseReturn.id,
        purchaseId: purchase.id,
      });

      return purchaseReturn;
    }, interactiveTransactionOptions);

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not record purchase return";
    console.error("[POST /api/purchases/:id/returns]", e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
