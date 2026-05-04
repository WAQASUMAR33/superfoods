/** Default display name (overridable via Settings → Business). */
export const BRAND_DISPLAY_NAME = "Super Foods" as const;

/** Legacy DB / import values → current brand (reports, settings, receipts). */
export function normalizeLegacyBusinessName(name: string): string {
  const t = name.trim();
  if (!t) return BRAND_DISPLAY_NAME;
  if (/^rice\s*traders$/i.test(t)) return BRAND_DISPLAY_NAME;
  return t;
}

/** Logo served from `/public` (used in shell, login, reports, ledger PDF/print). */
export const BRAND_LOGO_SRC = "/amb_logo.png" as const;

/** Example letterhead footer lines (Italy); replace in Settings for your locale. */
export const DEFAULT_BUSINESS_CONTACT = {
  address: [
    "VIA RICERCA SCIENTIFICA 10 - 41012 CARPI (MO)",
    "e-mail: ambrice39@gmail.com",
    "IBAN : IT30P0538723304000003371063",
  ].join("\n"),
  phone: "00393331663199 / 00393294328474",
  ntnNumber: "C.F. MMTMRU88P07Z236X  P.Iva 03962060368",
} as const;
