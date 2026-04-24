export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { getStockLevels } from "@/lib/inventory";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ProductsPage() {
  const [products, stockLevels] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { brand: true },
      orderBy: [{ variety: "asc" }, { name: "asc" }],
    }),
    getStockLevels(prisma),
  ]);

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Products" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{products.length} active products</p>
          <Link
            href="/products/new"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        </div>

        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Variety</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Brand</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Sale Price/Kg</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock (Kg)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => {
                const stock = stockLevels[p.id] ?? 0;
                const threshold = Number(p.lowStockThresholdKg);
                const statusVariant = stock <= 0 ? "destructive" : stock <= threshold ? "warning" : "success";
                const statusLabel = stock <= 0 ? "Out of Stock" : stock <= threshold ? "Low Stock" : "In Stock";

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.variety}</td>
                    <td className="px-4 py-3 text-gray-500">{p.brand?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.salePrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(stock, 2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant as "destructive" | "warning" | "success"}>{statusLabel}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/products/${p.id}`} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">
                        <Edit className="h-3 w-3" /> Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
