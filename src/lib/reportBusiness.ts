import { Prisma } from "@prisma/client";
import { BRAND_DISPLAY_NAME, DEFAULT_BUSINESS_CONTACT, normalizeLegacyBusinessName } from "@/config/branding";
import { APP_CURRENCY } from "@/config/locale";
import { prisma } from "@/lib/prisma";

export type ReportBusinessInfo = {
  businessName: string;
  address: string | null;
  phone: string | null;
  ntnNumber: string | null;
};

/** Used when DATABASE_URL host is unreachable or settings row cannot be loaded. */
const DEFAULT_REPORT_BUSINESS: ReportBusinessInfo = {
  businessName: BRAND_DISPLAY_NAME,
  address: DEFAULT_BUSINESS_CONTACT.address,
  phone: DEFAULT_BUSINESS_CONTACT.phone,
  ntnNumber: DEFAULT_BUSINESS_CONTACT.ntnNumber,
};

/** True for Prisma/host errors when DATABASE_URL target is down or unreachable (P1001, etc.). */
export function isLikelyUnreachableDb(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001 Can't reach database server | P1017 Server has closed the connection | P1008 Operations timed out
    return ["P1001", "P1008", "P1017"].includes(error.code);
  }
  const msg =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  return /can't reach database|connection refused|ENOTFOUND|EAI_AGAIN/i.test(msg);
}

/** Business block for report / print headers — always row id 1 when the DB is available. */
export async function getReportBusinessInfo(): Promise<ReportBusinessInfo> {
  try {
    const row = await prisma.businessSettings.upsert({
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
      select: {
        businessName: true,
        address: true,
        phone: true,
        ntnNumber: true,
      },
    });

    return {
      businessName: normalizeLegacyBusinessName(row.businessName),
      address: row.address,
      phone: row.phone,
      ntnNumber: row.ntnNumber,
    };
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      const detail = e instanceof Error ? e.message : String(e);
      console.warn(`[getReportBusinessInfo] ${detail}`);
    }
    if (isLikelyUnreachableDb(e)) {
      return { ...DEFAULT_REPORT_BUSINESS };
    }
    throw e;
  }
}

/** dd/mm/yyyy — matches formal Italian-style document headers on reports. */
export function formatReportItalianDate(d: Date): string {
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}
