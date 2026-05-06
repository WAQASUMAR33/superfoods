export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

const UpdateBrandSchema = z.object({
  name: z.string().min(1),
});

async function requireAdmin(params: Promise<{ id: string }>) {
  const session = await getServerSession(authOptions);
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isAdmin((session.user as { role?: string }).role)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const { id } = await params;
  const brandId = Number(id);
  if (Number.isNaN(brandId)) return { response: NextResponse.json({ error: "Invalid id" }, { status: 400 }) };
  return { brandId } as const;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(params);
  if ("response" in ctx) return ctx.response;

  const body = await req.json().catch(() => null);
  const parsed = UpdateBrandSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const updated = await prisma.brand.update({
      where: { id: ctx.brandId },
      data: { name: parsed.data.name.trim() },
    });
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update brand";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(params);
  if ("response" in ctx) return ctx.response;
  const existing = await prisma.brand.findUnique({ where: { id: ctx.brandId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.product.updateMany({ where: { brandId: ctx.brandId }, data: { brandId: null } });
    await tx.brand.delete({ where: { id: ctx.brandId } });
  });
  return NextResponse.json({ ok: true, mode: "deleted_and_detached_products" });
}
