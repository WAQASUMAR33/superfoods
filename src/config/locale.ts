/** ISO 4217 code for business amounts (Italy). */
export const APP_CURRENCY = "EUR" as const;

/**
 * Locale for dates and non-currency numbers (e.g. kg).
 * Kept separate from money so tables stay readable.
 */
export const APP_LOCALE = "it-IT" as const;

/**
 * Locale for `Intl` currency formatting (EUR with leading €, e.g. €1.234,56).
 * `it-IT` + EUR renders as a trailing "€" and can clip in narrow cells; PDF core fonts also lack €.
 */
export const APP_CURRENCY_LOCALE = "en-IE" as const;
