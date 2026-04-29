export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/Header";
import { ReportDocumentHeader } from "@/components/reports/ReportDocumentHeader";
import { ReportExportBar } from "@/components/reports/ReportExportBar";
import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "@/lib/csv";
import { getReportBusinessInfo, formatReportItalianDate, isLikelyUnreachableDb } from "@/lib/reportBusiness";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function PurchaseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = params.to ? new Date(params.to) : new Date();
  to.setHours(23, 59, 59);

  const company = await getReportBusinessInfo();
  const refId = `${from.toISOString().slice(0, 10).replace(/-/g, "")}-${to.toISOString().slice(0, 10).replace(/-/g, "")}`;

  const purchaseQuery = () =>
    prisma.purchase.findMany({
      where: { purchaseDate: { gte: from, lte: to } },
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { purchaseDate: "desc" },
    });

  let purchases: Awaited<ReturnType<typeof purchaseQuery>> = [];
  try {
    purchases = await purchaseQuery();
  } catch (e) {
    if (!isLikelyUnreachableDb(e)) throw e;
    if (process.env.NODE_ENV === "development") {
      console.warn("[PurchaseReportPage] Database unavailable; showing empty report.", e);
    }
  }

  const totalPurchase = purchases.reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalPaid = purchases.reduce((s, p) => s + Number(p.paidAmount), 0);
  const totalBalance = purchases.reduce((s, p) => s + Number(p.balanceDue), 0);

  const byProduct: Record<string, { name: string; kg: number; cost: number }> = {};
  for (const p of purchases) {
    for (const item of p.items) {
      const key = item.productId.toString();
      if (!byProduct[key]) byProduct[key] = { name: item.product.name, kg: 0, cost: 0 };
      byProduct[key].kg += Number(item.quantityKg);
      byProduct[key].cost += Number(item.totalCost);
    }
  }

  const productRowsSorted = Object.values(byProduct).sort((a, b) => b.cost - a.cost);

  const invoicesCsv = rowsToCsv(
    ["Date", "Invoice No.", "Supplier", "Total", "Paid", "Balance Due"],
    purchases.map((p) => [
      p.purchaseDate.toISOString().slice(0, 10),
      p.invoiceNo,
      p.supplier.name,
      Number(p.totalAmount).toFixed(2),
      Number(p.paidAmount).toFixed(2),
      Number(p.balanceDue).toFixed(2),
    ])
  );

  const byProductCsv = rowsToCsv(
    ["Product", "Kg Purchased", "Total Cost", "Avg cost / Kg"],
    productRowsSorted.map((row) => {
      const avg = row.kg > 0 ? row.cost / row.kg : 0;
      return [row.name, row.kg.toFixed(3), Number(row.cost).toFixed(2), avg.toFixed(4)];
    })
  );

  const summaryCsv = rowsToCsv(
    ["Metric", "Amount"],
    [
      ["Total purchases (invoice)", Number(totalPurchase).toFixed(2)],
      ["Total paid", Number(totalPaid).toFixed(2)],
      ["Balance due (period)", Number(totalBalance).toFixed(2)],
    ]
  );

  const reportCsv = [summaryCsv, "", "Purchases by invoice", invoicesCsv, "", "Purchases by product", byProductCsv].join(
    "\r\n"
  );

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Purchase Report" />
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
            <input
              type="date"
              name="to"
              defaultValue={to.toISOString().slice(0, 10)}
              className="mt-1 block rounded border px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            Filter
          </button>
        </form>

        <ReportExportBar filenameStem={`purchase-report-${refId}`} csv={reportCsv}>
          <ReportDocumentHeader
            company={company}
            docLabel="Purchase Report nr."
            docNumber={refId}
            docDateText={formatReportItalianDate(to)}
            bannerLeft="Purchase detail"
            bannerRight="Filtered period"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Total Purchase Value", value: formatCurrency(totalPurchase), color: "text-[#7c3aed]" },
              { label: "Total Paid", value: formatCurrency(totalPaid), color: "text-[#16a34a]" },
              { label: "Balance Outstanding", value: formatCurrency(totalBalance), color: "text-[#ea580c]" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b bg-white px-4 py-3 text-sm font-bold text-neutral-900">Purchases by invoice</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Invoice</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Supplier</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Total</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Paid</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">{formatReportItalianDate(p.purchaseDate)}</td>
                      <td className="px-4 py-2 font-medium">{p.invoiceNo}</td>
                      <td className="px-4 py-2">{p.supplier.name}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-medium">{formatCurrency(Number(p.totalAmount))}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-green-700">{formatCurrency(Number(p.paidAmount))}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-orange-700">{formatCurrency(Number(p.balanceDue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {purchases.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No purchases in this period.</p>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b bg-white px-4 py-3 text-sm font-bold text-neutral-900">Purchases by product</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Kg</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Total cost</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Avg / Kg</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productRowsSorted.map((p) => {
                  const avg = p.kg > 0 ? p.cost / p.kg : 0;
                  return (
                    <tr key={p.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(p.kg, 3)}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(p.cost)}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(avg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {productRowsSorted.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No product lines in this period.</p>
            )}
          </div>
        </ReportExportBar>
      </div>
    </div>
  );
}
