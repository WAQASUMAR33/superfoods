export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { getStockLevels, getStockStatus } from "@/lib/inventory";
import { formatNumber } from "@/lib/utils";
import { Package, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default async function StockPage() {
  const [products, brands] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { brand: true },
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const stockLevels = await getStockLevels(prisma);

  const rows = products.map((p) => {
    const stockKg = stockLevels[p.id] ?? 0;
    const threshold = Number(p.lowStockThresholdKg);
    const status = getStockStatus(stockKg, threshold);
    return { ...p, stockKg, threshold, status };
  });

  const summary = {
    total: rows.length,
    ok: rows.filter((r) => r.status === "ok").length,
    low: rows.filter((r) => r.status === "low").length,
    critical: rows.filter((r) => r.status === "critical").length,
  };

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Stock Levels" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Products", value: summary.total, icon: Package, color: "text-[#0099D6]", bg: "bg-[#0099D6]/10" },
            { label: "In Stock", value: summary.ok, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Low Stock", value: summary.low, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Out of Stock", value: summary.critical, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className={`rounded-xl p-2.5 ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">All Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Brand</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Stock (Kg)</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Threshold (Kg)</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{row.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{row.code}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{row.brand?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                      {formatNumber(row.stockKg, 1)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500">
                      {formatNumber(row.threshold, 0)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {row.status === "ok" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle className="h-3 w-3" /> OK
                        </span>
                      )}
                      {row.status === "low" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Low
                        </span>
                      )}
                      {row.status === "critical" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <XCircle className="h-3 w-3" /> Out
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No products found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
