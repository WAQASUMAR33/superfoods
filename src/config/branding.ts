/** Default display name — LASANI FOODS letterhead branding (overridable via Settings → Business). */
export const BRAND_DISPLAY_NAME = "LASANI FOODS DI MUMTAZ UMAIR" as const;

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
