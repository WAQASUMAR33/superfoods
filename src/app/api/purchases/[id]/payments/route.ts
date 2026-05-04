export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { postJournalEntry, getSystemAccounts, updatePartyLedger } from "@/lib/double-entry";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { formatCurrency } from "@/lib/utils";

const PaymentSchema = z.object({
  amount: z.number().min(0.01),
  method: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CREDIT"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as { id: string }).id);
  const { id } = await params;
  const body = await req.json();
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const purchase = await prisma.purchase.findUnique({ where: { id: Number(id) } });
  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const balanceDue = Number(purchase.balanceDue);
  if (parsed.data.amount > balanceDue + 0.005) {
    return NextResponse.json(
      { error: `Payment cannot exceed balance due (${formatCurrency(balanceDue)}).` },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.purchasePayment.create({
      data: { purchaseId: Number(id), amount: parsed.data.amount, method: parsed.data.method, reference: parsed.data.reference, notes: parsed.data.notes },
    });

    const newPaid = Number(purchase.paidAmount) + parsed.data.amount;
    const newBalance = Number(purchase.totalAmount) - newPaid;

    await tx.purchase.update({
      where: { id: Number(id) },
      data: {
        paidAmount: newPaid,
        balanceDue: newBalance,
        status: newBalance <= 0 ? "PAID" : "PARTIALLY_PAID",
      },
    });

    const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

    await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
      description: `Payment for purchase ${purchase.internalRef}`,
      referenceType: "PAYMENT",
      referenceId: payment.id,
      purchaseId: purchase.id,
      createdById: userId,
      lines: [
        { accountId: accounts["2001"], type: "DEBIT", amount: parsed.data.amount },
        { accountId: accounts["1001"], type: "CREDIT", amount: parsed.data.amount },
      ],
    });

    await updatePartyLedger(tx as Parameters<typeof updatePartyLedger>[0], {
      supplierId: purchase.supplierId,
      type: "DEBIT",
      amount: parsed.data.amount,
      description: `Payment for ${purchase.internalRef}`,
      referenceType: "PAYMENT",
      referenceId: payment.id,
      purchaseId: purchase.id,
    });

    return payment;
  }, interactiveTransactionOptions);

  return NextResponse.json(result, { status: 201 });
}
