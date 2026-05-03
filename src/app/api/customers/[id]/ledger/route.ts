export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customerId = Number(id);
  if (Number.isNaN(customerId)) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from")?.trim();
  const toStr = searchParams.get("to")?.trim();
  if (!fromStr || !toStr) {
    return NextResponse.json(
      { error: "Query parameters `from` and `to` are required (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  let from: Date;
  let to: Date;
  try {
    from = startOfDay(parseISO(fromStr));
    to = endOfDay(parseISO(toStr));
  } catch {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  if (from.getTime() > to.getTime()) {
    return NextResponse.json({ error: "`from` must be on or before `to`." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, code: true, openingBalance: true },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const entries = await prisma.partyLedgerEntry.findMany({
    where: { customerId, entryDate: { gte: from, lte: to } },
    orderBy: [{ entryDate: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      openingBalance: Number(customer.openingBalance),
    },
    range: { from: from.toISOString(), to: to.toISOString() },
    entries: entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate.toISOString(),
      description: e.description,
      type: e.type,
      amount: Number(e.amount),
      runningBalance: Number(e.runningBalance),
    })),
  });
}
