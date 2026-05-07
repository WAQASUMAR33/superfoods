export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaleReturnPayloadSchema } from "@/types";
import { toKg, Unit } from "@/lib/units";
import { recordStockMovement } from "@/lib/inventory";
import { postJournalEntry, getSystemAccounts, updatePartyLedger } from "@/lib/double-entry";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { PrismaClient } from "@prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Sum kg already returned for this sale line (same sale document). */
async function previouslyReturnedKg(tx: TxClient, saleId: number, saleItemId: number): Promise<number> {
  const agg = await tx.saleReturnItem.aggregate({
    where: {
      saleItemId,
      saleReturn: { saleId },
    },
    _sum: { quantityKg: true },
  });
  return Number(agg._sum.quantityKg ?? 0);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as { id: string }).id);
  const saleId = Number((await params).id);
  if (Number.isNaN(saleId)) return NextResponse.json({ error: "Invalid sale id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SaleReturnPayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  try {
    const saleReturnResult = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true },
      });
      if (!sale) throw new Error("Sale not found");

      if (data.refundMethod === "CREDIT" && !sale.customerId) {
        throw new Error("Credit refunds require a customer on the sale.");
      }

      const returnDate = data.returnDate ? new Date(data.returnDate) : new Date();

      const itemCreates: Array<{
        saleItemId: number;
        productId: number;
        quantityKg: number;
        displayUnit: string;
        displayQty: number;
        unitPriceKg: number;
        totalAmount: number;
      }> = [];

      for (const line of data.items) {
        const saleItem = sale.items.find((it) => it.id === line.saleItemId);
        if (!saleItem) throw new Error(`Sale line #${line.saleItemId} is not part of this sale.`);

        const unit = saleItem.displayUnit as Unit;
        const returnQtyKg = toKg(line.displayQty, unit);
        if (returnQtyKg <= 0) throw new Error("Return quantity must be positive.");

        const prior = await previouslyReturnedKg(tx as TxClient, saleId, saleItem.id);
        const maxKg = Number(saleItem.quantityKg);
        if (prior + returnQtyKg > maxKg + 1e-6) {
          throw new Error(`Return quantity exceeds remaining for line #${saleItem.id}. Already returned ${prior.toFixed(3)} kg.`);
        }

        const lineTotal = Number(
          (((returnQtyKg / maxKg) * Number(saleItem.totalAmount))).toFixed(2)
        );

        itemCreates.push({
          saleItemId: saleItem.id,
          productId: saleItem.productId,
          quantityKg: returnQtyKg,
          displayUnit: saleItem.displayUnit,
          displayQty: line.displayQty,
          unitPriceKg: Number(saleItem.unitPriceKg),
          totalAmount: lineTotal,
        });
      }

      const totalAmount = Number(itemCreates.reduce((sum, row) => sum + row.totalAmount, 0).toFixed(2));
      let refundedAmount = data.refundedAmount ?? (data.refundMethod === "CASH" ? totalAmount : 0);
      refundedAmount = Number(Math.min(Math.max(refundedAmount, 0), totalAmount).toFixed(2));

      const year = returnDate.getFullYear();
      const rc = await tx.saleReturn.count({ where: { returnDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
      const returnNo = `SR-${year}-${String(rc + 1).padStart(5, "0")}`;

      const saleReturn = await tx.saleReturn.create({
        data: {
          returnNo,
          saleId,
          customerId: sale.customerId ?? undefined,
          userId,
          returnDate,
          totalAmount,
          refundMethod: data.refundMethod,
          refundedAmount,
          notes: data.notes?.trim() ? data.notes.trim() : null,
          items: {
            create: itemCreates.map((row) => ({
              saleItemId: row.saleItemId,
              productId: row.productId,
              quantityKg: row.quantityKg,
              displayUnit: row.displayUnit,
              displayQty: row.displayQty,
              unitPriceKg: row.unitPriceKg,
              totalAmount: row.totalAmount,
            })),
          },
        },
        include: { items: true, sale: true },
      });

      for (const row of itemCreates) {
        await recordStockMovement(tx as Parameters<typeof recordStockMovement>[0], {
          productId: row.productId,
          type: "SALE_RETURN_IN",
          quantityKg: row.quantityKg,
          displayUnit: row.displayUnit as Unit,
          displayQty: row.displayQty,
          referenceId: saleReturn.id,
          referenceType: "SALE_RETURN",
          notes: returnNo,
        });
      }

      const hadReceivableImpact =
        !!sale.customerId &&
        (sale.status === "CREDIT" || sale.status === "PARTIALLY_PAID" || Number(sale.creditAmount) > 0.009);

      if (data.refundMethod === "CREDIT" && !hadReceivableImpact) {
        throw new Error("Credit refunds only apply when the sale had an unpaid balance recorded on customer account.");
      }

      const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

      const saleRef = `${sale.invoiceNo}`;
      const desc = `Sale return ${saleReturn.returnNo} (from ${saleRef})`;

      if (data.refundMethod === "CASH") {
        await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
          description: desc,
          entryDate: returnDate,
          referenceType: "SALE_RETURN",
          referenceId: saleReturn.id,
          saleReturnId: saleReturn.id,
          saleId: sale.id,
          createdById: userId,
          lines: [
            { accountId: accounts["4001"], type: "DEBIT", amount: totalAmount, description: "Sales return" },
            { accountId: accounts["1001"], type: "CREDIT", amount: totalAmount, description: "Refund cash" },
          ],
        });
      } else {
        await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
          description: desc,
          entryDate: returnDate,
          referenceType: "SALE_RETURN",
          referenceId: saleReturn.id,
          saleReturnId: saleReturn.id,
          saleId: sale.id,
          createdById: userId,
          lines: [
            { accountId: accounts["4001"], type: "DEBIT", amount: totalAmount, description: "Sales return" },
            { accountId: accounts["1100"], type: "CREDIT", amount: totalAmount, description: "Reduce receivable" },
          ],
        });
      }

      if (hadReceivableImpact) {
        await updatePartyLedger(tx as Parameters<typeof updatePartyLedger>[0], {
          customerId: sale.customerId!,
          type: "CREDIT",
          amount: totalAmount,
          description: `Sale return ${saleReturn.returnNo} (${saleRef})`,
          referenceType: "SALE_RETURN",
          referenceId: saleReturn.id,
          saleId: sale.id,
        });
      }

      return saleReturn;
    }, interactiveTransactionOptions);

    return NextResponse.json(saleReturnResult, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not record sale return";
    console.error("[POST /api/sales/:id/returns]", e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
