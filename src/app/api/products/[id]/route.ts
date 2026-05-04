export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductSchema } from "@/types";
import { getStockLevel } from "@/lib/inventory";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: {
      brand: true,
      stockMovements: { orderBy: { movedAt: "desc" }, take: 50 },
    },
  });

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stockKg = await getStockLevel(prisma, product.id);
  return NextResponse.json({ ...product, stockKg });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ProductSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  try {
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        code: d.code,
        name: d.name,
        brandId: d.brandId ?? null,
        defaultUnit: d.defaultUnit,
        salePrice: d.salePrice,
        purchasePrice: d.purchasePrice,
        lowStockThresholdKg: d.lowStockThresholdKg,
        notes: d.notes?.trim() ? d.notes : null,
      },
    });
    return NextResponse.json(product);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update product";
    console.error("[PUT /api/products/:id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const productId = Number(id);
  if (Number.isNaN(productId)) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  const existing = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
