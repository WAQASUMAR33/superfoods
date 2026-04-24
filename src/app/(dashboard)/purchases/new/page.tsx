export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/purchases/PurchaseForm";
import { getStockLevels } from "@/lib/inventory";

export default async function NewPurchasePage() {
  const [suppliers, products] = await Promise.all([
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const stockLevels = await getStockLevels(prisma);

  const productsWithStock = products.map((p) => ({
    ...p,
    salePrice: Number(p.salePrice),
    purchasePrice: Number(p.purchasePrice),
    stockKg: stockLevels[p.id] ?? 0,
  }));

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="New Purchase" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <PurchaseForm suppliers={suppliers} products={productsWithStock} />
        </div>
      </div>
    </div>
  );
}
