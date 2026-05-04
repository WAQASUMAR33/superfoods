export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductSchema } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(q && {
        OR: [{ name: { contains: q } }, { code: { contains: q } }],
      }),
    },
    include: { brand: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const product = await prisma.product.create({
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
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create product";
    console.error("[POST /api/products]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
