import Image from "next/image";
import { BRAND_LOGO_SRC } from "@/config/branding";

/** Dark red — letterhead bars and rules (matches reference) */
const RED = "#b91c1c";
/** Light pink pills for report nr. / date */
const PINK_BG = "#ffe4e6";
const LOGO_BLUE = "#0099d6";

export type ReportDocumentHeaderProps = {
  company: {
    businessName: string;
    address: string | null;
    phone: string | null;
    ntnNumber: string | null;
  };
  docLabel: string;
  docNumber: string;
  dateConnector?: string;
  docDateText: string;
  bannerLeft: string;
  bannerRight: string;
  logoSrc?: string;
};

/**
 * Formal report letterhead: vertical logo strip, large company title, thick red rule,
 * contact lines, right-aligned metadata with pink highlights, then uneven red section banners (≈8/4).
 */
export function ReportDocumentHeader({
  company,
  docLabel,
  docNumber,
  dateConnector = "del",
  docDateText,
  bannerLeft,
  bannerRight,
  logoSrc = BRAND_LOGO_SRC,
}: ReportDocumentHeaderProps) {
  const addressLines = company.address
    ?.split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  const lines = [
    ...addressLines,
    company.phone?.trim() ? `Tel. ${company.phone.trim()}` : null,
    company.ntnNumber?.trim() ? company.ntnNumber.trim() : null,
  ].filter(Boolean) as string[];

  return (
    <header className="border border-neutral-300 bg-white print:border-neutral-400">
      <div className="flex flex-col sm:flex-row sm:min-h-[6.5rem]">
        {/* Left: vertical logo strip */}
        <aside className="flex w-full shrink-0 items-stretch justify-center border-b border-neutral-200 bg-neutral-50/90 sm:w-[5.25rem] sm:border-b-0 sm:border-r">
          <div className="relative mx-auto my-3 aspect-square h-20 w-20 overflow-hidden border border-neutral-200 bg-white sm:mx-3 sm:my-4 sm:h-[4.75rem] sm:w-[4.75rem]">
            {logoSrc ? (
              <Image src={logoSrc} alt="" fill className="object-contain p-1.5" sizes="80px" priority />
            ) : (
              <CompanyLogoMark />
            )}
          </div>
        </aside>

        {/* Right: title, red rule, optional contactlines, metadata — main content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
            <h2 className="text-[1.25rem] font-extrabold uppercase leading-snug tracking-tight text-neutral-900 sm:text-2xl sm:leading-tight">
              {company.businessName}
            </h2>
            {/* Thick red horizontal rule — full width of this column */}
            <div
              className="mt-2 h-[5px] w-full sm:h-1"
              style={{ backgroundColor: RED }}
              aria-hidden
            />
          </div>

          {lines.length > 0 ? (
            <div className="space-y-0.5 border-t border-neutral-100 px-4 py-2.5 text-[11px] leading-relaxed text-neutral-800 sm:px-5 sm:text-xs">
              {lines.map((line) => (
                <p key={line} className="max-w-none">
                  {line}
                </p>
              ))}
            </div>
          ) : null}

          {/* Metadata: below rule / contact — right-aligned, pink pills */}
          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5 px-4 py-3 sm:px-5">
            <span className="text-xs font-semibold tracking-tight text-neutral-900 sm:text-sm">{docLabel}</span>
            <span
              className="inline-flex min-h-[1.65rem] min-w-[3rem] items-center justify-center rounded-sm px-2.5 py-1 text-xs font-bold tabular-nums leading-none text-neutral-900 sm:text-sm"
              style={{ backgroundColor: PINK_BG }}
            >
              {docNumber}
            </span>
            <span className="text-xs font-semibold lowercase text-neutral-800 sm:text-sm">{dateConnector}</span>
            <span
              className="inline-flex min-h-[1.65rem] min-w-[6rem] items-center justify-center rounded-sm px-2.5 py-1 text-xs font-bold tabular-nums leading-none text-neutral-900 sm:text-sm"
              style={{ backgroundColor: PINK_BG }}
            >
              {docDateText}
            </span>
          </div>
        </div>
      </div>

      {/* Section banners — left wider (detail), right narrower (period): ~66% / 33% */}
      <div className="grid grid-cols-1 gap-px bg-neutral-200 px-px pb-px sm:grid-cols-12">
        <div
          className="flex min-h-[2.65rem] items-center px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white sm:col-span-8 sm:text-sm sm:tracking-wider"
          style={{ backgroundColor: RED }}
        >
          {bannerLeft}
        </div>
        <div
          className="flex min-h-[2.65rem] items-center px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white sm:col-span-4 sm:text-sm sm:tracking-wider"
          style={{ backgroundColor: RED }}
        >
          {bannerRight}
        </div>
      </div>
    </header>
  );
}

function CompanyLogoMark() {
  const blue = LOGO_BLUE;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-white px-0.5 py-1">
      <svg viewBox="0 0 64 32" width="52" height="24" aria-hidden className="shrink-0">
        <title>Wheat emblem</title>
        <path
          fill={blue}
          d="M28 4c-9 10-16 24-16 36h4c0-10 6-22 12-30zM36 4c9 10 16 24 16 36h-4c0-10-6-22-12-30z"
          opacity={0.88}
        />
        <path stroke={blue} strokeWidth="1.2" fill="none" d="M32 26V9" opacity={0.45} />
      </svg>
      <div className="relative w-full max-w-[4.5rem] text-center">
        <span
          className="text-[9px] font-black leading-tight tracking-[0.08em] sm:text-[10px]"
          style={{ color: blue }}
        >
          Super
          <br />
          Foods
        </span>
        {/* Crossbar emphasis on “A” — extends slightly right like brand mark */}
        <span
          className="absolute left-[5%] top-[42%] block h-[2px] w-[42%] rounded-[1px] sm:left-[6%]"
          style={{ backgroundColor: blue }}
          aria-hidden
        />
      </div>
    </div>
  );
}
