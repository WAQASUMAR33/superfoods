export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BRAND_DISPLAY_NAME, normalizeLegacyBusinessName } from "@/config/branding";
import { APP_CURRENCY } from "@/config/locale";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  businessName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  ntnNumber: z.string().optional(),
  currency: z.string().default(APP_CURRENCY),
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
      businessName: BRAND_DISPLAY_NAME,
      currency: APP_CURRENCY,
      invoicePrefix: "INV",
      purchasePrefix: "PUR",
      lowStockDefaultKg: 200,
    },
  });
  return NextResponse.json({
    ...settings,
    businessName: normalizeLegacyBusinessName(settings.businessName),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = {
    ...parsed.data,
    businessName: normalizeLegacyBusinessName(parsed.data.businessName),
    lowStockDefaultKg: parsed.data.lowStockDefaultKg,
  };
  const settings = await prisma.businessSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  return NextResponse.json(settings);
}
