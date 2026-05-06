export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

const CreateUnitSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kgFactor: z.number().positive(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const units = await prisma.unitDefinition.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateUnitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const unit = await prisma.unitDefinition.create({
      data: {
        code: parsed.data.code.trim().toUpperCase(),
        name: parsed.data.name.trim(),
        kgFactor: parsed.data.kgFactor,
        isActive: true,
      },
    });
    return NextResponse.json(unit, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create unit";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
