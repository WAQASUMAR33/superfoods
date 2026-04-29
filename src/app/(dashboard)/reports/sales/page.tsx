export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { ReportDocumentHeader } from "@/components/reports/ReportDocumentHeader";
import { ReportExportBar } from "@/components/reports/ReportExportBar";
import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "@/lib/csv";
import { getReportBusinessInfo, formatReportItalianDate } from "@/lib/reportBusiness";
import { formatCurrency } from "@/lib/utils";
import { SalesReportChart } from "./SalesReportChart";

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = params.to ? new Date(params.to) : new Date();
  to.setHours(23, 59, 59);

  const company = await getReportBusinessInfo();
  const refId = `${from.toISOString().slice(0, 10).replace(/-/g, "")}-${to.toISOString().slice(0, 10).replace(/-/g, "")}`;

  const sales = await prisma.sale.findMany({
    where: { saleDate: { gte: from, lte: to } },
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { saleDate: "desc" },
  });

  const totalRevenue = sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
  const totalPaid = sales.reduce((s, sale) => s + Number(sale.paidAmount), 0);
  const totalCredit = sales.reduce((s, sale) => s + Number(sale.creditAmount), 0);

  const byProduct: Record<string, { name: string; kgSold: number; revenue: number }> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId.toString();
      if (!byProduct[key]) byProduct[key] = { name: item.product.name, kgSold: 0, revenue: 0 };
      byProduct[key].kgSold += Number(item.quantityKg);
      byProduct[key].revenue += Number(item.totalAmount);
    }
  }

  const sortedProducts = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);

  const byDate: Record<string, number> = {};
  for (const s of sales) {
    const d = s.saleDate.toISOString().slice(0, 10);
    byDate[d] = (byDate[d] ?? 0) + Number(s.totalAmount);
  }
  const dailyRows = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => [date, Number(amount).toFixed(2)]);

  const summaryCsv = rowsToCsv(
    ["Metric", "Amount"],
    [
      ["Total Revenue", totalRevenue.toFixed(2)],
      ["Cash Collected", totalPaid.toFixed(2)],
      ["Credit Outstanding", totalCredit.toFixed(2)],
    ]
  );
  const productCsv = rowsToCsv(
    ["Product", "Kg Sold", "Revenue", "Avg per Kg"],
    sortedProducts.map((p) => [
      p.name,
      p.kgSold.toFixed(2),
      p.revenue.toFixed(2),
      (p.kgSold > 0 ? p.revenue / p.kgSold : 0).toFixed(4),
    ])
  );
  const dailyCsv =
    dailyRows.length > 0
      ? rowsToCsv(
          ["Date", "Sales amount"],
          dailyRows as [string, string][]
        )
      : "";
  const reportCsv = [summaryCsv, "", "Sales by product", productCsv, "", "Daily totals", dailyCsv].filter(Boolean).join("\r\n");

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Sales Report" />
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

        <ReportExportBar filenameStem={`sales-report-${refId}`} csv={reportCsv}>
          <ReportDocumentHeader
            company={company}
            docLabel="Sales Report nr."
            docNumber={refId}
            docDateText={formatReportItalianDate(to)}
            bannerLeft="Report detail"
            bannerRight="Filtered period"
          />

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Revenue", value: formatCurrency(totalRevenue), color: "text-blue-600" },
              { label: "Cash Collected", value: formatCurrency(totalPaid), color: "text-green-600" },
              { label: "Credit Outstanding", value: formatCurrency(totalCredit), color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <SalesReportChart sales={sales.map((s) => ({ date: s.saleDate.toISOString().slice(0, 10), amount: Number(s.totalAmount) }))} />

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-4 py-3 text-sm font-semibold">Sales by Product</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs uppercase text-gray-500">Product</th>
                  <th className="px-4 py-2 text-right text-xs uppercase text-gray-500">Kg Sold</th>
                  <th className="px-4 py-2 text-right text-xs uppercase text-gray-500">Revenue</th>
                  <th className="px-4 py-2 text-right text-xs uppercase text-gray-500">Avg/Kg</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedProducts.map((p) => (
                  <tr key={p.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-right">{p.kgSold.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(p.revenue)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(p.kgSold > 0 ? p.revenue / p.kgSold : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportExportBar>
      </div>
    </div>
  );
}
