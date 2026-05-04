export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { postJournalEntry, getSystemAccounts, updatePartyLedger } from "@/lib/double-entry";
import { supplierRunningBalanceInTx } from "@/lib/partyBalances";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { formatCurrency } from "@/lib/utils";

const BodySchema = z.object({
  amount: z.number().min(0.01),
  method: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CREDIT"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * On-account supplier payment (no purchase invoice).
 * Reduces AP and supplier party ledger — use purchase payments when paying a specific bill.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as { id: string }).id);
  const { id } = await params;
  const supplierId = Number(id);
  if (Number.isNaN(supplierId)) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const balanceDue = await supplierRunningBalanceInTx(tx, supplierId);
      if (balanceDue <= 0.005) {
        throw new Error("No positive balance due on the supplier ledger for this payment.");
      }
      if (parsed.data.amount > balanceDue + 0.005) {
        throw new Error(`Amount cannot exceed balance due (${formatCurrency(balanceDue)}).`);
      }

      const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

      const je = await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
        description: `Supplier payment (on account) — ${supplier.name}`,
        referenceType: "SUPPLIER_PAYMENT",
        createdById: userId,
        lines: [
          { accountId: accounts["2001"], type: "DEBIT", amount: parsed.data.amount, description: "AP - supplier" },
          { accountId: accounts["1001"], type: "CREDIT", amount: parsed.data.amount, description: "Cash/bank" },
        ],
      });

      await updatePartyLedger(tx as Parameters<typeof updatePartyLedger>[0], {
        supplierId,
        type: "DEBIT",
        amount: parsed.data.amount,
        description:
          parsed.data.notes?.trim() ||
          `On-account payment${parsed.data.reference ? ` (${parsed.data.reference})` : ""} — JE ${je.entryNo}`,
        referenceType: "SUPPLIER_PAYMENT",
        referenceId: je.id,
      });

      return { journalEntryId: je.id, entryNo: je.entryNo };
    }, interactiveTransactionOptions);

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not record payment";
    const status = /cannot exceed|No positive balance/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
