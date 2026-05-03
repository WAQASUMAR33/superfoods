export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { postJournalEntry, getSystemAccounts } from "@/lib/double-entry";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { ExpenseSchema } from "@/types";

function normalizeExpenseDate(value: string): Date | null {
  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function requireAdmin(paramsPromise: Promise<{ id: string }>) {
  const session = await getServerSession(authOptions);
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const role = (session.user as { role?: string })?.role;
  if (!isAdmin(role)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const { id } = await paramsPromise;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return { response: NextResponse.json({ error: "Invalid id" }, { status: 400 }) };
  return { numericId } as const;
}

async function rebuildExpenseJournal(
  tx: any,
  expense: z.infer<typeof ExpenseSchema> & { id: number }
) {
  const category = await tx.expenseCategory.findUnique({ where: { id: expense.categoryId } });
  const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);
  const cashId = accounts["1001"];
  const miscExpenseId = accounts["6099"];
  if (!cashId) throw new Error("MISSING_ACCOUNTS:CASH — System Cash account (1001) missing.");
  const expenseAccountId = category?.accountId ?? miscExpenseId;
  if (!expenseAccountId) throw new Error("MISSING_ACCOUNTS:EXPENSE — Miscellaneous Expense (6099) missing.");

  await tx.journalLine.deleteMany({
    where: { journalEntry: { referenceType: "EXPENSE", referenceId: expense.id } },
  });
  await tx.journalEntry.deleteMany({
    where: { referenceType: "EXPENSE", referenceId: expense.id },
  });

  await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
    description: `Expense: ${category?.name ?? "Misc"} - ${expense.description ?? ""}`,
    referenceType: "EXPENSE",
    referenceId: expense.id,
    lines: [
      { accountId: expenseAccountId, type: "DEBIT", amount: expense.amount },
      { accountId: cashId, type: "CREDIT", amount: expense.amount },
    ],
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(params);
  if ("response" in ctx) return ctx.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = ExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const expenseDate = normalizeExpenseDate(parsed.data.expenseDate);
  if (!expenseDate) return NextResponse.json({ error: "Invalid expenseDate." }, { status: 400 });

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.expense.findUnique({ where: { id: ctx.numericId } });
        if (!existing) throw new Error("NOT_FOUND");

        const row = await tx.expense.update({
          where: { id: ctx.numericId },
          data: { ...parsed.data, expenseDate },
        });
        await rebuildExpenseJournal(tx as never, {
          id: row.id,
          categoryId: row.categoryId,
          amount: Number(row.amount),
          description: row.description ?? undefined,
          expenseDate: row.expenseDate.toISOString(),
          paymentMethod: row.paymentMethod as "CASH" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT",
          reference: row.reference ?? undefined,
        });
        return row;
      },
      interactiveTransactionOptions
    );
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update expense";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    const status = msg.startsWith("MISSING_ACCOUNTS") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(params);
  if ("response" in ctx) return ctx.response;
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { id: ctx.numericId } });
      if (!existing) throw new Error("NOT_FOUND");

      await tx.journalLine.deleteMany({
        where: { journalEntry: { referenceType: "EXPENSE", referenceId: ctx.numericId } },
      });
      await tx.journalEntry.deleteMany({
        where: { referenceType: "EXPENSE", referenceId: ctx.numericId },
      });
      await tx.expense.delete({ where: { id: ctx.numericId } });
    }, interactiveTransactionOptions);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not delete expense";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
