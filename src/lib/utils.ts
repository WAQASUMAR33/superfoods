import { APP_CURRENCY, APP_CURRENCY_LOCALE, APP_LOCALE } from "@/config/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Coerce Prisma Decimal, strings, etc. to a finite number (else NaN). */
export function toFiniteNumber(amount: number | string | null | undefined | { toString(): string }): number {
  if (amount == null || amount === "") return 0;
  if (typeof amount === "number") return Number.isFinite(amount) ? amount : NaN;
  if (typeof amount === "string") {
    const n = Number(amount.trim());
    return Number.isFinite(n) ? n : NaN;
  }
  if (typeof amount === "object" && "toString" in amount) {
    const n = Number(String((amount as { toString(): string }).toString()).trim());
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/** On-screen and API messages: EUR with consistent grouping (see APP_CURRENCY_LOCALE). */
export function formatCurrency(amount: number | string | null | undefined | { toString(): string }): string {
  const num = toFiniteNumber(amount);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat(APP_CURRENCY_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** jsPDF / Helvetica-safe money (ASCII only; no € glyph). */
export function formatCurrencyAscii(amount: number | string | null | undefined | { toString(): string }): string {
  const num = toFiniteNumber(amount);
  if (!Number.isFinite(num)) return "—";
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

/** Chart axes and compact summaries (e.g. €1.2K). */
export function formatCurrencyCompact(value: number | string | null | undefined): string {
  const num = toFiniteNumber(value);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat(APP_CURRENCY_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

export function formatNumber(num: number | string | null | undefined | { toString(): string }, decimals = 2): string {
  return Number(num ?? 0).toLocaleString(APP_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(APP_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString(APP_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateInvoiceNo(prefix: string, id: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(id).padStart(5, "0")}`;
}
