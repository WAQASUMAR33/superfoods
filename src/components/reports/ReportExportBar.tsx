"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, FileSpreadsheet } from "lucide-react";

type Props = {
  /** Used for the print dialog title and the downloaded file name (without extension for Excel). */
  filenameStem: string;
  /** UTF-8 CSV body (no BOM); use `rowsToCsv` on the server and pass the result. Omit to hide Excel download. */
  csv?: string | null;
  /** Shown next to the buttons; keep filters/metrics outside this wrapper if they should not print. */
  children: React.ReactNode;
};

/** Print (browser) + Download as Excel-compatible CSV. */
export function ReportExportBar({ filenameStem, csv, children }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerPrint = useReactToPrint({
    contentRef,
    documentTitle: filenameStem.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120),
  });

  function downloadExcelCsv() {
    if (!csv?.length) return;
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const safe = filenameStem.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.csv`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => triggerPrint()}
          className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print
        </button>
        {csv != null && csv.length > 0 ? (
          <button
            type="button"
            onClick={downloadExcelCsv}
            className="inline-flex items-center gap-1.5 rounded border border-emerald-700/30 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-100"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            Excel (CSV)
          </button>
        ) : null}
      </div>
      <div ref={contentRef} className="space-y-6 print:space-y-4 print:py-0">
        {children}
      </div>
    </div>
  );
}
