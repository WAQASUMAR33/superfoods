export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  businessName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  ntnNumber: z.string().optional(),
  currency: z.string().default("PKR"),
  invoicePrefix: z.string().min(1),
  purchasePrefix: z.string().min(1),
  lowStockDefaultKg: z.number().min(0),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.businessSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      businessName: "AMB Super Foods",
      currency: "PKR",
      invoicePrefix: "INV",
      purchasePrefix: "PUR",
      lowStockDefaultKg: 200,
    },
  });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const settings = await prisma.businessSettings.upsert({
    where: { id: 1 },
    update: { ...parsed.data, lowStockDefaultKg: parsed.data.lowStockDefaultKg },
    create: { id: 1, ...parsed.data, lowStockDefaultKg: parsed.data.lowStockDefaultKg },
  });
  return NextResponse.json(settings);
}
