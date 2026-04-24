export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaleSchema } from "@/types";
import { toKg, Unit } from "@/lib/units";
import { recordStockMovement, getStockLevel } from "@/lib/inventory";
import { postJournalEntry, getSystemAccounts, updatePartyLedger } from "@/lib/double-entry";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 20;

  const sales = await prisma.sale.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { saleDate: "desc" },
    include: { customer: true, user: true, items: { include: { product: true } } },
  });

  const total = await prisma.sale.count();
  return NextResponse.json({ sales, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as { id: string }).id);
  const body = await req.json();
  const parsed = SaleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    const itemsWithKg = await Promise.all(
      data.items.map(async (item) => {
        const quantityKg = toKg(item.displayQty, item.displayUnit as Unit);
        const stockKg = await getStockLevel(tx as Parameters<typeof getStockLevel>[0], item.productId);

        if (stockKg < quantityKg) {
          throw new Error(`Insufficient stock for product #${item.productId}. Available: ${stockKg.toFixed(2)} Kg`);
        }

        const lineTotal = quantityKg * item.unitPriceKg * (1 - item.discount / 100);
        subtotal += lineTotal;
        return { ...item, quantityKg, lineTotal };
      })
    );

    const totalAmount = subtotal - data.discountAmount;
    const isCredit = data.paymentMethod === "CREDIT";
    const creditAmount = isCredit ? totalAmount : Math.max(0, totalAmount - data.paidAmount);
    const changeAmount = !isCredit ? Math.max(0, data.paidAmount - totalAmount) : 0;
    const status = isCredit ? "CREDIT" : creditAmount > 0 ? "PARTIALLY_PAID" : "COMPLETED";

    const count = await tx.sale.count();
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerId: data.customerId,
        userId,
        status,
        subtotal,
        discountAmount: data.discountAmount,
        totalAmount,
        paidAmount: isCredit ? 0 : data.paidAmount,
        creditAmount,
        changeAmount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        items: {
          create: itemsWithKg.map((item) => ({
            productId: item.productId,
            quantityKg: item.quantityKg,
            displayUnit: item.displayUnit,
            displayQty: item.displayQty,
            unitPriceKg: item.unitPriceKg,
            discount: item.discount,
            totalAmount: item.lineTotal,
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    for (const item of itemsWithKg) {
      await recordStockMovement(tx as Parameters<typeof recordStockMovement>[0], {
        productId: item.productId,
        type: "SALE_OUT",
        quantityKg: item.quantityKg,
        displayUnit: item.displayUnit as Unit,
        displayQty: item.displayQty,
        referenceId: sale.id,
        referenceType: "SALE",
      });
    }

    const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

    if (isCredit && data.customerId) {
      await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
        description: `Credit sale ${invoiceNo}`,
        saleId: sale.id,
        lines: [
          { accountId: accounts["1100"], type: "DEBIT", amount: totalAmount },
          { accountId: accounts["4001"], type: "CREDIT", amount: totalAmount },
        ],
      });
      await updatePartyLedger(tx as Parameters<typeof updatePartyLedger>[0], {
        customerId: data.customerId,
        type: "DEBIT",
        amount: totalAmount,
        description: `Sale ${invoiceNo}`,
        referenceType: "SALE",
        saleId: sale.id,
      });
    } else {
      await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
        description: `Cash sale ${invoiceNo}`,
        saleId: sale.id,
        lines: [
          { accountId: accounts["1001"], type: "DEBIT", amount: totalAmount },
          { accountId: accounts["4001"], type: "CREDIT", amount: totalAmount },
        ],
      });
    }

    return sale;
  });

  return NextResponse.json(result, { status: 201 });
}
