export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getStockLevels } from "@/lib/inventory";
import { interactiveTransactionOptions } from "@/lib/interactiveTransaction";
import { POSTerminal } from "@/components/pos/POSTerminal";

export default async function POSPage() {
  const { products, customers, stockLevels } = await prisma.$transaction(
    async (tx) => {
      const products = await tx.product.findMany({
        where: { isActive: true },
        include: { brand: true },
        orderBy: [{ variety: "asc" }, { name: "asc" }],
      });
      const customers = await tx.customer.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      const stockLevels = await getStockLevels(tx);
      return { products, customers, stockLevels };
    },
    interactiveTransactionOptions
  );

  /** Plain JSON only — Prisma Decimals cannot be passed to Client Components */
  const productsPlain = products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    variety: p.variety,
    defaultUnit: p.defaultUnit,
    salePrice: Number(p.salePrice),
    stockKg: stockLevels[p.id] ?? 0,
    lowStockThresholdKg: Number(p.lowStockThresholdKg),
    brand: p.brand ? { name: p.brand.name } : null,
  }));

  const customersPlain = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    creditLimit: Number(c.creditLimit),
  }));

  return (
    <div className="flex h-full overflow-hidden">
      <POSTerminal products={productsPlain} customers={customersPlain} />
    </div>
  );
}
