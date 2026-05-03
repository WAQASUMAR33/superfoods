export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseSchema } from "@/types";
import { postJournalEntry, getSystemAccounts } from "@/lib/double-entry";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";

function normalizeExpenseDate(value: string): Date | null {
  // Accept date-only input from HTML <input type="date"> and full ISO datetime values.
  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 20;

  const expenses = await prisma.expense.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { expenseDate: "desc" },
    include: { category: true },
  });

  const total = await prisma.expense.count();
  return NextResponse.json({ expenses, total });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const expenseDate = normalizeExpenseDate(parsed.data.expenseDate);
  if (!expenseDate) {
    return NextResponse.json(
      { error: "Invalid expenseDate. Use YYYY-MM-DD or an ISO datetime string." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const expense = await tx.expense.create({
          data: {
            ...parsed.data,
            expenseDate,
          },
        });

        const category = await tx.expenseCategory.findUnique({ where: { id: parsed.data.categoryId } });
        const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

        const cashId = accounts["1001"];
        const miscExpenseId = accounts["6099"];
        if (!cashId) {
          throw new Error(
            "MISSING_ACCOUNTS:CASH — System Cash account (1001) missing. Run: npx prisma db seed"
          );
        }
        const expenseAccountId = category?.accountId ?? miscExpenseId;
        if (!expenseAccountId) {
          throw new Error(
            "MISSING_ACCOUNTS:EXPENSE — Miscellaneous Expense (6099) missing. Run: npx prisma db seed"
          );
        }

        await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
          description: `Expense: ${category?.name ?? "Misc"} - ${parsed.data.description ?? ""}`,
          referenceType: "EXPENSE",
          referenceId: expense.id,
          lines: [
            { accountId: expenseAccountId, type: "DEBIT", amount: parsed.data.amount },
            { accountId: cashId, type: "CREDIT", amount: parsed.data.amount },
          ],
        });

        return expense;
      },
      interactiveTransactionOptions
    );

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save expense.";
    console.error("[POST /api/expenses]", e);
    const status =
      typeof msg === "string" && msg.startsWith("MISSING_ACCOUNTS")
        ? 503
        : msg.includes("unbalanced") || msg.includes("Journal")
          ? 400
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
