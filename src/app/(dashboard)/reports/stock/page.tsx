export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { getStockLevels } from "@/lib/inventory";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function StockReportPage() {
  const [products, stockLevels] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { brand: true },
      orderBy: [{ variety: "asc" }, { name: "asc" }],
    }),
    getStockLevels(prisma),
  ]);

  const rows = products.map((p) => {
    const stockKg = stockLevels[p.id] ?? 0;
    const value = stockKg * Number(p.purchasePrice);
    return { ...p, stockKg, value, salePrice: Number(p.salePrice), purchasePrice: Number(p.purchasePrice) };
  });

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalSaleValue = rows.reduce((s, r) => s + r.stockKg * r.salePrice, 0);

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Stock Valuation" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Cost Value</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalValue)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Sale Value</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalSaleValue)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Gross Margin</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(totalSaleValue - totalValue)}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Variety</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock (Kg)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Cost/Kg</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Cost Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Sale/Kg</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Sale Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.variety}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(r.stockKg, 2)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(r.purchasePrice)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.value)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(r.salePrice)}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(r.stockKg * r.salePrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase">Total</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totalValue)}</td>
                <td />
                <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totalSaleValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
