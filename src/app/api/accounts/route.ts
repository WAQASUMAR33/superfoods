export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  parentId: z.number().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
    include: {
      _count: { select: { lines: true } },
      lines: { select: { type: true, amount: true } },
    },
  });

  const result = accounts.map((a) => {
    let balance = 0;
    for (const l of a.lines) {
      const amt = Number(l.amount);
      if (l.type === "DEBIT") {
        balance += ["ASSET", "EXPENSE"].includes(a.type) ? amt : -amt;
      } else {
        balance += ["LIABILITY", "EQUITY", "INCOME"].includes(a.type) ? amt : -amt;
      }
    }
    return {
      id: a.id, code: a.code, name: a.name, type: a.type,
      isSystem: a.isSystem, txCount: a._count.lines, balance,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const account = await prisma.account.create({ data: parsed.data });
  return NextResponse.json(account, { status: 201 });
}
