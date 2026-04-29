export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PurchaseSchema } from "@/types";
import { toKg, Unit } from "@/lib/units";
import { recordStockMovement } from "@/lib/inventory";
import { postJournalEntry, getSystemAccounts, updatePartyLedger } from "@/lib/double-entry";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 20;

  const purchases = await prisma.purchase.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { purchaseDate: "desc" },
    include: { supplier: true, user: true, items: { include: { product: true } } },
  });

  const total = await prisma.purchase.count();
  return NextResponse.json({ purchases, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as { id: string }).id);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PurchaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  try {
  const result = await prisma.$transaction(async (tx) => {
    const count = await tx.purchase.count();
    const internalRef = `PUR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    let subtotal = 0;
    const itemsWithKg = data.items.map((item) => {
      const quantityKg = toKg(item.displayQty, item.displayUnit as Unit);
      const totalCost = quantityKg * item.unitCostKg;
      subtotal += totalCost;
      return { ...item, quantityKg, totalCost };
    });

    subtotal = subtotal - data.discount;
    const paidAmount = data.paymentMethod === "CREDIT" ? 0 : (data.paidAmount ?? subtotal);
    const balanceDue = subtotal - paidAmount;

    const purchase = await tx.purchase.create({
      data: {
        invoiceNo: data.invoiceNo,
        internalRef,
        supplierId: data.supplierId,
        userId,
        purchaseDate: new Date(data.purchaseDate),
        subtotal,
        discount: data.discount,
        totalAmount: subtotal,
        paidAmount,
        balanceDue,
        moisturePercent: data.moisturePercent,
        qualityGrade: data.qualityGrade,
        qualityNotes: data.qualityNotes,
        vehicleNo: data.vehicleNo,
        driverName: data.driverName,
        status: balanceDue > 0 ? (paidAmount > 0 ? "PARTIALLY_PAID" : "RECEIVED") : "PAID",
        items: {
          create: itemsWithKg.map((item) => ({
            productId: item.productId,
            quantityKg: item.quantityKg,
            displayUnit: item.displayUnit,
            displayQty: item.displayQty,
            unitCostKg: item.unitCostKg,
            totalCost: item.totalCost,
            bagWeight: item.bagWeight,
          })),
        },
      },
    });

    for (const item of itemsWithKg) {
      await recordStockMovement(tx as Parameters<typeof recordStockMovement>[0], {
        productId: item.productId,
        type: "PURCHASE_IN",
        quantityKg: item.quantityKg,
        displayUnit: item.displayUnit as Unit,
        displayQty: item.displayQty,
        unitCostKg: item.unitCostKg,
        referenceId: purchase.id,
        referenceType: "PURCHASE",
      });
    }

    const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

    if (data.paymentMethod === "CREDIT" || balanceDue > 0) {
      await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
        description: `Purchase ${internalRef} - ${data.invoiceNo}`,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        purchaseId: purchase.id,
        createdById: userId,
        lines: [
          { accountId: accounts["1200"], type: "DEBIT", amount: subtotal, description: "Rice stock purchase" },
          { accountId: accounts["2001"], type: "CREDIT", amount: subtotal, description: "AP - supplier" },
        ],
      });

      await updatePartyLedger(tx as Parameters<typeof updatePartyLedger>[0], {
        supplierId: data.supplierId,
        type: "CREDIT",
        amount: subtotal,
        description: `Purchase ${internalRef}`,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        purchaseId: purchase.id,
      });
    } else {
      await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
        description: `Purchase ${internalRef} - cash payment`,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        purchaseId: purchase.id,
        createdById: userId,
        lines: [
          { accountId: accounts["1200"], type: "DEBIT", amount: subtotal },
          { accountId: accounts["1001"], type: "CREDIT", amount: subtotal },
        ],
      });
    }

    if (paidAmount > 0 && balanceDue > 0) {
      await tx.purchasePayment.create({
        data: { purchaseId: purchase.id, amount: paidAmount, method: data.paymentMethod, reference: data.paymentReference },
      });
    }

    return purchase;
  }, interactiveTransactionOptions);

  return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : "Could not save purchase";
    console.error("[POST /api/purchases]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
