export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchSaleSchema = z.object({
  invoiceNo: z.string().trim().min(1).max(191),
  saleDate: z.string().min(1),
  notes: z.union([z.string(), z.null()]),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      user: true,
      items: { include: { product: { include: { brand: true } } } },
    },
  });

  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sale);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const saleId = Number(id);
  if (Number.isNaN(saleId)) return NextResponse.json({ error: "Invalid sale id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchSaleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const saleDate = new Date(parsed.data.saleDate);
  if (Number.isNaN(saleDate.getTime())) {
    return NextResponse.json({ error: "Invalid saleDate" }, { status: 400 });
  }

  const existing = await prisma.sale.findUnique({ where: { id: saleId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const notes =
    parsed.data.notes === null ? null : String(parsed.data.notes).trim() || null;

  try {
    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        invoiceNo: parsed.data.invoiceNo,
        saleDate,
        notes,
      },
      include: { customer: true, user: true, items: { include: { product: { include: { brand: true } } } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "That invoice number is already in use." }, { status: 409 });
    }
    throw e;
  }
}
