export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseSchema } from "@/types";
import { postJournalEntry, getSystemAccounts } from "@/lib/double-entry";

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

  const result = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({ data: parsed.data });

    const category = await tx.expenseCategory.findUnique({ where: { id: parsed.data.categoryId } });
    const accounts = await getSystemAccounts(tx as Parameters<typeof getSystemAccounts>[0]);

    const expenseAccountId = category?.accountId ?? accounts["6099"];

    await postJournalEntry(tx as Parameters<typeof postJournalEntry>[0], {
      description: `Expense: ${category?.name ?? "Misc"} - ${parsed.data.description ?? ""}`,
      referenceType: "EXPENSE",
      referenceId: expense.id,
      lines: [
        { accountId: expenseAccountId, type: "DEBIT", amount: parsed.data.amount },
        { accountId: accounts["1001"], type: "CREDIT", amount: parsed.data.amount },
      ],
    });

    return expense;
  });

  return NextResponse.json(result, { status: 201 });
}
