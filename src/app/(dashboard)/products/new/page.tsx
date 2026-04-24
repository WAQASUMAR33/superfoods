export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/products/ProductForm";

export default async function NewProductPage() {
  const brands = await prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Add Product" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <ProductForm brands={brands} />
        </div>
      </div>
    </div>
  );
}
