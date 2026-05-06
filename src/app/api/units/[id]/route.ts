export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

const UpdateUnitSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kgFactor: z.number().positive(),
});

async function requireAdmin(params: Promise<{ id: string }>) {
  const session = await getServerSession(authOptions);
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isAdmin((session.user as { role?: string }).role)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const { id } = await params;
  const unitId = Number(id);
  if (Number.isNaN(unitId)) return { response: NextResponse.json({ error: "Invalid id" }, { status: 400 }) };
  return { unitId } as const;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(params);
  if ("response" in ctx) return ctx.response;

  const body = await req.json().catch(() => null);
  const parsed = UpdateUnitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  try {
    const nextCode = data.code.trim().toUpperCase();
    const current = await prisma.unitDefinition.findUnique({ where: { id: ctx.unitId } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (current.code !== nextCode) {
      const inUse = await prisma.product.count({ where: { defaultUnit: current.code, isActive: true } });
      if (inUse > 0) {
        return NextResponse.json(
          { error: "Unit code is used by active products. Reassign products before changing the code." },
          { status: 409 }
        );
      }
    }
    const updated = await prisma.unitDefinition.update({
      where: { id: ctx.unitId },
      data: {
        code: nextCode,
        name: data.name.trim(),
        kgFactor: data.kgFactor,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update unit";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(params);
  if ("response" in ctx) return ctx.response;
  const unit = await prisma.unitDefinition.findUnique({ where: { id: ctx.unitId } });
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inUse = await prisma.product.count({ where: { defaultUnit: unit.code, isActive: true } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: "Unit is linked to products. Reassign those products first, then delete." },
      { status: 409 }
    );
  }

  await prisma.unitDefinition.delete({ where: { id: ctx.unitId } });
  return NextResponse.json({ ok: true, mode: "deleted" });
}
