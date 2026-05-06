export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/products/ProductForm";
import { getActiveUnitsOrFallback } from "@/lib/unitDefinitions";

export default async function NewProductPage() {
  const [brands, units] = await Promise.all([
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getActiveUnitsOrFallback(),
  ]);
  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Add Product" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <ProductForm
            brands={brands}
            units={units.map((u) => ({ id: u.id, code: u.code, name: u.name, kgFactor: u.kgFactor }))}
          />
        </div>
      </div>
    </div>
  );
}
