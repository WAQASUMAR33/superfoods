export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { ReportDocumentHeader } from "@/components/reports/ReportDocumentHeader";
import { ReportExportBar } from "@/components/reports/ReportExportBar";
import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "@/lib/csv";
import { getReportBusinessInfo, formatReportItalianDate } from "@/lib/reportBusiness";
import { APP_LOCALE } from "@/config/locale";
import { formatCurrency } from "@/lib/utils";

export default async function ProfitLossPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = params.to ? new Date(params.to) : new Date();
  to.setHours(23, 59, 59);

  const company = await getReportBusinessInfo();
  const refId = `PL-${from.toISOString().slice(0, 10).replace(/-/g, "")}-${to.toISOString().slice(0, 10).replace(/-/g, "")}`;

  const [salesAgg, purchasesAgg, expenses] = await Promise.all([
    prisma.sale.aggregate({ where: { saleDate: { gte: from, lte: to } }, _sum: { totalAmount: true } }),
    prisma.purchaseItem.aggregate({
      where: { purchase: { purchaseDate: { gte: from, lte: to } } },
      _sum: { totalCost: true },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: from, lte: to } },
      include: { category: true },
    }),
  ]);

  const revenue = Number(salesAgg._sum.totalAmount ?? 0);
  const cogs = Number(purchasesAgg._sum.totalCost ?? 0);
  const grossProfit = revenue - cogs;

  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const e of expenses) {
    expensesByCategory[e.category.name] = (expensesByCategory[e.category.name] ?? 0) + Number(e.amount);
    totalExpenses += Number(e.amount);
  }

  const netProfit = grossProfit - totalExpenses;

  const plCsv = [
    rowsToCsv(
      ["Line", "Amount"],
      [
        ["Sales revenue", revenue.toFixed(2)],
        ["Cost of goods sold (purchases)", (-cogs).toFixed(2)],
        ["Gross profit", grossProfit.toFixed(2)],
      ]
    ),
    Object.keys(expensesByCategory).length > 0
      ? rowsToCsv(
          ["Expense category", "Amount"],
          Object.entries(expensesByCategory).map(([cat, amt]) => [cat, (-amt).toFixed(2)])
        )
      : "",
    rowsToCsv(
      ["Line", "Amount"],
      [
        ["Total operating expenses", (-totalExpenses).toFixed(2)],
        [`Net ${netProfit >= 0 ? "profit" : "loss"}`, Math.abs(netProfit).toFixed(2)],
      ]
    ),
  ]
    .filter(Boolean)
    .join("\r\n\r\n");

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Profit & Loss" />
      <div className="flex-1 overflow-y-auto p-6">
        <form className="mb-6 flex flex-wrap gap-3 print:hidden items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              name="from"
              defaultValue={from.toISOString().slice(0, 10)}
              className="mt-1 block rounded border px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">To</label>
            <input type="date" name="to" defaultValue={to.toISOString().slice(0, 10)} className="mt-1 block rounded border px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
            Filter
          </button>
        </form>

        <ReportExportBar filenameStem={`profit-loss-${refId}`} csv={plCsv}>
          <ReportDocumentHeader
            company={company}
            docLabel="Profit & Loss nr."
            docNumber={refId}
            docDateText={`${formatReportItalianDate(from)} – ${formatReportItalianDate(to)}`}
            bannerLeft="Income statement"
            bannerRight="Selected period"
          />

          <div className="mx-auto max-w-xl overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="bg-gray-900 px-6 py-4 text-white">
              <h2 className="text-lg font-bold">Profit & Loss Statement</h2>
              <p className="mt-0.5 text-xs text-gray-300">
                {from.toLocaleDateString(APP_LOCALE, { day: "2-digit", month: "short", year: "numeric" })} —{" "}
                {to.toLocaleDateString(APP_LOCALE, { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>

            <table className="w-full text-sm">
              <tbody>
                <tr className="bg-blue-50">
                  <td className="px-6 py-3 font-bold text-blue-900">INCOME</td>
                  <td />
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-2 pl-10 text-gray-700">Sales Revenue</td>
                  <td className="px-6 py-2 text-right font-medium">{formatCurrency(revenue)}</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="px-6 py-2 font-semibold text-gray-800">Gross Revenue</td>
                  <td className="px-6 py-2 text-right font-bold text-blue-700">{formatCurrency(revenue)}</td>
                </tr>

                <tr className="bg-red-50">
                  <td className="px-6 py-3 font-bold text-red-900">COST OF GOODS SOLD</td>
                  <td />
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-2 pl-10 text-gray-700">Purchase Cost</td>
                  <td className="px-6 py-2 text-right font-medium text-red-600">({formatCurrency(cogs)})</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="px-6 py-2 font-semibold text-gray-800">Gross Profit</td>
                  <td className={`px-6 py-2 text-right font-bold ${grossProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(grossProfit)}
                  </td>
                </tr>

                <tr className="bg-orange-50">
                  <td className="px-6 py-3 font-bold text-orange-900">OPERATING EXPENSES</td>
                  <td />
                </tr>
                {Object.entries(expensesByCategory).map(([cat, amt]) => (
                  <tr key={cat} className="border-b">
                    <td className="px-6 py-2 pl-10 text-gray-700">{cat}</td>
                    <td className="px-6 py-2 text-right text-red-600">({formatCurrency(amt)})</td>
                  </tr>
                ))}
                <tr className="border-b bg-gray-50">
                  <td className="px-6 py-2 font-semibold text-gray-800">Total Expenses</td>
                  <td className="px-6 py-2 text-right font-bold text-red-600">({formatCurrency(totalExpenses)})</td>
                </tr>

                <tr className={netProfit >= 0 ? "bg-green-50" : "bg-red-50"}>
                  <td className="px-6 py-4 text-lg font-bold text-gray-900">NET {netProfit >= 0 ? "PROFIT" : "LOSS"}</td>
                  <td className={`px-6 py-4 text-right text-xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(Math.abs(netProfit))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ReportExportBar>
      </div>
    </div>
  );
}
