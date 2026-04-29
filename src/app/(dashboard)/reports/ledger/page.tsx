export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/Header";
import { ReportDocumentHeader } from "@/components/reports/ReportDocumentHeader";
import { ReportExportBar } from "@/components/reports/ReportExportBar";
import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "@/lib/csv";
import { getReportBusinessInfo, formatReportItalianDate } from "@/lib/reportBusiness";
import { formatCurrency } from "@/lib/utils";

export default async function LedgerReportPage() {
  const now = new Date();
  const company = await getReportBusinessInfo();
  const refStem = `party-ledger-${now.toISOString().slice(0, 10)}`;

  const entries = await prisma.partyLedgerEntry.findMany({
    take: 500,
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    include: { customer: true, supplier: true },
  });

  const reportCsv = rowsToCsv(
    ["Date", "Party", "Type", "Description", "Amount", "Running balance", "Reference"],
    entries.map((e) => {
      const party =
        e.customer?.name ?? (e.supplier ? `Supplier: ${e.supplier.name}` : "—");
      return [
        e.entryDate.toISOString().slice(0, 10),
        party,
        e.type,
        e.description,
        Number(e.amount).toFixed(2),
        Number(e.runningBalance).toFixed(2),
        `${e.referenceType}${e.referenceId != null ? ` #${e.referenceId}` : ""}`,
      ];
    })
  );

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Ledger Report" />
      <div className="flex-1 overflow-y-auto p-6">
        <p className="mb-4 max-w-2xl text-sm text-gray-600 print:hidden">
          Recent party ledger movements (last 500 lines). Filter by party from customer or supplier detail screens will be
          added in a future update.
        </p>

        <ReportExportBar filenameStem={refStem} csv={reportCsv}>
          <ReportDocumentHeader
            company={company}
            docLabel="Party ledger nr."
            docNumber="—"
            docDateText={formatReportItalianDate(now)}
            bannerLeft="Ledger entries"
            bannerRight="Posted movements"
          />

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-4 py-3 text-sm font-semibold">Recent entries</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Party</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((e) => {
                    const party = e.customer?.name ?? e.supplier?.name ?? "—";
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatReportItalianDate(e.entryDate)}</td>
                        <td className="max-w-[140px] truncate px-3 py-2 font-medium" title={party}>
                          {party}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{e.type}</td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-gray-700" title={e.description}>
                          {e.description}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                            Number(e.amount) >= 0 ? "text-green-800" : "text-red-700"
                          }`}
                        >
                          {formatCurrency(Number(e.amount))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-gray-800">
                          {formatCurrency(Number(e.runningBalance))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {entries.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No ledger entries yet.</p>
            )}
          </div>
        </ReportExportBar>
      </div>
    </div>
  );
}
