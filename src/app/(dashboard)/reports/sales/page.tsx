export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SalesReportChart } from "./SalesReportChart";

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = params.to ? new Date(params.to) : new Date();
  to.setHours(23, 59, 59);

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

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Sales Report" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <form className="flex gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-500">From</label>
            <input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} className="mt-1 block rounded border px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">To</label>
            <input type="date" name="to" defaultValue={to.toISOString().slice(0, 10)} className="mt-1 block rounded border px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">Filter</button>
        </form>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Revenue", value: formatCurrency(totalRevenue), color: "text-blue-600" },
            { label: "Cash Collected", value: formatCurrency(totalPaid), color: "text-green-600" },
            { label: "Credit Outstanding", value: formatCurrency(totalCredit), color: "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <SalesReportChart sales={sales.map((s) => ({ date: s.saleDate.toISOString().slice(0, 10), amount: Number(s.totalAmount) }))} />

        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 font-semibold text-sm">Sales by Product</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Product</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Kg Sold</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Revenue</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Avg/Kg</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).map((p) => (
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
      </div>
    </div>
  );
}
