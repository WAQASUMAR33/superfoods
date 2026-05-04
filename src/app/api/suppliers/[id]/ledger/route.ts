export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReportBusinessInfo } from "@/lib/reportBusiness";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supplierId = Number(id);
  if (Number.isNaN(supplierId)) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

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

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, name: true, code: true, openingBalance: true },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const [entries, business] = await Promise.all([
    prisma.partyLedgerEntry.findMany({
      where: { supplierId, entryDate: { gte: from, lte: to } },
      orderBy: [{ entryDate: "asc" }, { id: "asc" }],
    }),
    getReportBusinessInfo(),
  ]);

  return NextResponse.json({
    supplier: {
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      openingBalance: Number(supplier.openingBalance),
    },
    business: {
      businessName: business.businessName,
      address: business.address,
      phone: business.phone,
      ntnNumber: business.ntnNumber,
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
