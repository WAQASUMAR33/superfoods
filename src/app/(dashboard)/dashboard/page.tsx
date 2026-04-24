export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { getStockLevels } from "@/lib/inventory";
import { DashboardCharts } from "./DashboardCharts";
import { ShoppingCart, Truck, AlertTriangle, TrendingUp } from "lucide-react";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [salesToday, purchasesToday, products, lowStockProducts, recentSales] = await Promise.all([
    prisma.sale.aggregate({ where: { saleDate: { gte: today } }, _sum: { totalAmount: true }, _count: true }),
    prisma.purchase.aggregate({ where: { purchaseDate: { gte: today } }, _sum: { totalAmount: true }, _count: true }),
    prisma.product.findMany({ where: { isActive: true }, include: { brand: true } }),
    prisma.product.findMany({ where: { isActive: true } }),
    prisma.sale.findMany({
      take: 8,
      orderBy: { saleDate: "desc" },
      include: { customer: true, items: true },
    }),
  ]);

  const stockLevels = await getStockLevels(prisma);
  const lowStockCount = lowStockProducts.filter(
    (p) => (stockLevels[p.id] ?? 0) <= Number(p.lowStockThresholdKg)
  ).length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const salesChart = await Promise.all(
    last7Days.map(async (day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const res = await prisma.sale.aggregate({
        where: { saleDate: { gte: day, lt: next } },
        _sum: { totalAmount: true },
      });
      return {
        date: day.toLocaleDateString("en-PK", { weekday: "short", day: "numeric" }),
        sales: Number(res._sum.totalAmount ?? 0),
      };
    })
  );

  return {
    salesToday: { amount: Number(salesToday._sum.totalAmount ?? 0), count: salesToday._count },
    purchasesToday: { amount: Number(purchasesToday._sum.totalAmount ?? 0), count: purchasesToday._count },
    lowStockCount,
    totalProducts: products.length,
    recentSales,
    salesChart,
  };
}

const kpiConfig = [
  {
    label: "Sales Today",
    icon: ShoppingCart,
    gradient: "from-blue-500 to-blue-600",
    iconBg: "bg-blue-400/20",
    shadow: "shadow-blue-500/20",
  },
  {
    label: "Purchases Today",
    icon: Truck,
    gradient: "from-violet-500 to-violet-600",
    iconBg: "bg-violet-400/20",
    shadow: "shadow-violet-500/20",
  },
  {
    label: "Low Stock Alerts",
    icon: AlertTriangle,
    gradient: "from-rose-500 to-rose-600",
    iconBg: "bg-rose-400/20",
    shadow: "shadow-rose-500/20",
  },
  {
    label: "Total Products",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-400/20",
    shadow: "shadow-emerald-500/20",
  },
];

export default async function DashboardPage() {
  const data = await getDashboardData();

  const kpis = [
    {
      ...kpiConfig[0],
      value: formatCurrency(data.salesToday.amount),
      sub: `${data.salesToday.count} transactions`,
    },
    {
      ...kpiConfig[1],
      value: formatCurrency(data.purchasesToday.amount),
      sub: `${data.purchasesToday.count} purchase orders`,
    },
    {
      ...kpiConfig[2],
      value: String(data.lowStockCount),
      sub: "products below threshold",
    },
    {
      ...kpiConfig[3],
      value: String(data.totalProducts),
      sub: "active products",
    },
  ];

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Dashboard" />

      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${kpi.gradient} p-5 text-white shadow-lg ${kpi.shadow}`}
              >
                {/* Background decoration */}
                <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-6 -right-2 h-20 w-20 rounded-full bg-white/5" />

                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                      {kpi.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold leading-none">{kpi.value}</p>
                    <p className="mt-1.5 text-xs text-white/60">{kpi.sub}</p>
                  </div>
                  <div className={`rounded-xl ${kpi.iconBg} p-2.5`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <DashboardCharts salesChart={data.salesChart} />

        {/* Recent Sales */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">Recent Sales</h2>
          </div>

          {data.recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <ShoppingCart className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No sales yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</th>
                    <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 sm:table-cell">Items</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-indigo-600">
                        {sale.invoiceNo}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {sale.customer?.name ?? (
                          <span className="text-slate-400 italic">Walk-in</span>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 text-slate-500 sm:table-cell">
                        {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            sale.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : sale.status === "CREDIT"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
