export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { postJournalEntry, getSystemAccounts, updatePartyLedger } from "@/lib/double-entry";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";

const BodySchema = z.object({
  cashAmount: z.number().min(0).default(0),
  chequeAmount: z.number().min(0).default(0),
  bankAmount: z.number().min(0).default(0),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as { id: string }).id);
  const { id } = await params;
  const customerId = Number(id);
  if (Number.isNaN(customerId)) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { cashAmount, chequeAmount, bankAmount, reference, notes } = parsed.data;
  const totalAmount = cashAmount + chequeAmount + bankAmount;

  if (totalAmount < 0.01) {
    return NextResponse.json({ error: "Total payment must be at least 0.01" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

      const methods: { amount: number; accountId: number; label: string }[] = [];
      if (cashAmount > 0) methods.push({ amount: cashAmount, accountId: accounts["1001"], label: "Cash" });
      if (chequeAmount > 0) methods.push({ amount: chequeAmount, accountId: accounts["1002"], label: "Cheque" });
      if (bankAmount > 0) methods.push({ amount: bankAmount, accountId: accounts["1002"], label: "Bank transfer" });

      const methodSummary = methods.map((m) => m.label).join(" + ");

      const debitLines = methods.map((m) => ({
        accountId: m.accountId,
        type: "DEBIT" as const,
        amount: m.amount,
        description: m.label,
      }));

      const je = await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
        description: `Customer receipt (${methodSummary}) — ${customer.name}`,
        referenceType: "CUSTOMER_RECEIPT",
        createdById: userId,
        lines: [
          ...debitLines,
          { accountId: accounts["1100"], type: "CREDIT" as const, amount: totalAmount, description: "AR - customer" },
        ],
      });

      const ledgerDesc =
        notes?.trim() ||
        `Receipt [${methodSummary}]${reference ? ` ref: ${reference}` : ""} — JE ${je.entryNo}`;

      await updatePartyLedger(tx as Parameters<typeof updatePartyLedger>[0], {
        customerId,
        type: "CREDIT",
        amount: totalAmount,
        description: ledgerDesc,
        referenceType: "CUSTOMER_RECEIPT",
        referenceId: je.id,
      });

      return { journalEntryId: je.id, entryNo: je.entryNo };
    }, interactiveTransactionOptions);

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not record receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
