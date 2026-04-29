export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/purchases/PurchaseForm";

export default async function NewPurchasePage() {
  const [suppliers, products] = await Promise.all([
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  /** Plain objects only — Prisma Decimals cannot cross the server/client boundary */
  const suppliersPlain = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const productsPlain = products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    variety: p.variety,
    purchasePrice: Number(p.purchasePrice),
    defaultUnit: p.defaultUnit,
  }));

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="New Purchase" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <PurchaseForm suppliers={suppliersPlain} products={productsPlain} />
        </div>
      </div>
    </div>
  );
}
