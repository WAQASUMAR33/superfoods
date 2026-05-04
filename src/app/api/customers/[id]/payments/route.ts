export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { postJournalEntry, getSystemAccounts, updatePartyLedger } from "@/lib/double-entry";
import { customerRunningBalanceInTx } from "@/lib/partyBalances";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { formatCurrency } from "@/lib/utils";

const BodySchema = z.object({
  amount: z.number().min(0.01),
  method: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * General customer receipt (not allocated to a sale/invoice).
 * DR cash/bank, CR AR, and CREDIT customer party ledger up to current ledger balance due.
 */
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

  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const balanceDue = await customerRunningBalanceInTx(tx, customerId);
      if (balanceDue <= 0.005) {
        throw new Error("No receivable balance on the customer ledger for this receipt.");
      }
      if (parsed.data.amount > balanceDue + 0.005) {
        throw new Error(`Amount cannot exceed balance due (${formatCurrency(balanceDue)}).`);
      }

      const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

      const je = await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
        description: `Customer receipt (on account) — ${customer.name}`,
        referenceType: "CUSTOMER_RECEIPT",
        createdById: userId,
        lines: [
          { accountId: accounts["1001"], type: "DEBIT", amount: parsed.data.amount, description: "Cash/bank" },
          { accountId: accounts["1100"], type: "CREDIT", amount: parsed.data.amount, description: "AR - customer" },
        ],
      });

      await updatePartyLedger(tx as Parameters<typeof updatePartyLedger>[0], {
        customerId,
        type: "CREDIT",
        amount: parsed.data.amount,
        description:
          parsed.data.notes?.trim() ||
          `On-account receipt${parsed.data.reference ? ` (${parsed.data.reference})` : ""} — JE ${je.entryNo}`,
        referenceType: "CUSTOMER_RECEIPT",
        referenceId: je.id,
      });

      return { journalEntryId: je.id, entryNo: je.entryNo };
    }, interactiveTransactionOptions);

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not record receipt";
    const status = /cannot exceed|No receivable balance/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
