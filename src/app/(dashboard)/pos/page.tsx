export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getStockLevels } from "@/lib/inventory";
import { POSTerminal } from "@/components/pos/POSTerminal";

export default async function POSPage() {
  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { brand: true },
      orderBy: [{ variety: "asc" }, { name: "asc" }],
    }),
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const stockLevels = await getStockLevels(prisma);

  const productsWithStock = products.map((p) => ({
    ...p,
    salePrice: Number(p.salePrice),
    purchasePrice: Number(p.purchasePrice),
    lowStockThresholdKg: Number(p.lowStockThresholdKg),
    stockKg: stockLevels[p.id] ?? 0,
  }));

  return (
    <div className="flex h-full overflow-hidden">
      <POSTerminal products={productsWithStock} customers={customers} />
    </div>
  );
}
