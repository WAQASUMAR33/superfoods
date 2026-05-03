export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/products/ProductForm";
import { getStockLevel } from "@/lib/inventory";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const { product, brands, stockKg } = await prisma.$transaction(
    async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { brand: true, stockMovements: { orderBy: { movedAt: "desc" }, take: 30 } },
      });
      const brands = await tx.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
      if (!product) {
        return { product: null, brands, stockKg: 0 };
      }
      const stockKg = await getStockLevel(tx, product.id);
      return { product, brands, stockKg };
    },
    interactiveTransactionOptions
  );

  if (!product) notFound();

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title={`Edit: ${product.name}`} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="mx-auto max-w-2xl">
          <ProductForm key={product.id} brands={brands} product={product} />
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Stock History</h2>
            <span className="text-sm text-gray-500">Current: <strong>{formatNumber(stockKg, 2)} Kg</strong></span>
          </div>
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Qty (Kg)</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {product.stockMovements.map((m) => {
                  const isIn = ["PURCHASE_IN", "ADJUSTMENT_IN", "RETURN_IN"].includes(m.type);
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-2 text-xs text-gray-500">{formatDateTime(m.movedAt)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-medium ${isIn ? "text-green-600" : "text-red-600"}`}>
                          {m.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className={`px-4 py-2 text-right font-mono text-sm ${isIn ? "text-green-600" : "text-red-600"}`}>
                        {isIn ? "+" : "-"}{formatNumber(m.quantityKg, 3)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400">{m.notes ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
