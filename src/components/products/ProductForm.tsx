"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductSchema, type ProductFormData } from "@/types";
import { errorMessageFromFetchResponse } from "@/lib/httpErrorMessage";

interface Props {
  brands: { id: number; name: string }[];
  product?: {
    id: number;
    code: string;
    name: string;
    variety: string;
    grainLength?: string | null;
    brandId?: number | null;
    defaultUnit: string;
    salePrice: unknown;
    purchasePrice: unknown;
    lowStockThresholdKg: unknown;
    notes?: string | null;
  };
}

function decimalsToForm(product: NonNullable<Props["product"]>): ProductFormData {
  return {
    code: product.code,
    name: product.name,
    variety: product.variety,
    grainLength: product.grainLength ?? undefined,
    brandId: product.brandId ?? undefined,
    defaultUnit: (["KG", "MAUND", "BAG"].includes(product.defaultUnit) ? product.defaultUnit : "KG") as ProductFormData["defaultUnit"],
    salePrice: Number(product.salePrice),
    purchasePrice: Number(product.purchasePrice),
    lowStockThresholdKg: Number(product.lowStockThresholdKg),
    notes: product.notes ?? undefined,
  };
}

export function ProductForm({ brands, product }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!product;

  const { register, handleSubmit, control, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: product
      ? decimalsToForm(product)
      : {
          code: "",
          name: "",
          variety: "General",
          grainLength: undefined,
          brandId: undefined,
          defaultUnit: "KG",
          salePrice: 0,
          purchasePrice: 0,
          lowStockThresholdKg: 200,
          notes: undefined,
        },
  });

  async function onSubmit(data: ProductFormData) {
    setSaving(true);
    setError("");
    const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/products");
        router.refresh();
        return;
      }
      setError(await errorMessageFromFetchResponse(res));
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{isEdit ? "Edit Product" : "New Product"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="code">Product Code</Label>
              <Input id="code" {...register("code")} placeholder="PROD-001" className="mt-1" />
              {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" {...register("name")} placeholder="Product name" className="mt-1" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="variety">Variety</Label>
            <Input id="variety" {...register("variety")} placeholder="e.g. Basmati, Sella" className="mt-1" />
            {errors.variety && <p className="mt-1 text-xs text-red-500">{errors.variety.message}</p>}
          </div>

          <div>
            <Label htmlFor="grainLength">Grain length (optional)</Label>
            <Input id="grainLength" {...register("grainLength")} placeholder="e.g. EXTRA_LONG" className="mt-1" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Brand</Label>
              <Controller
                name="brandId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value != null ? String(field.value) : "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? undefined : Number(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="No brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No brand</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Default Unit</Label>
              <Controller
                name="defaultUnit"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KG">Kilograms (Kg)</SelectItem>
                      <SelectItem value="MAUND">Maunds (40 Kg)</SelectItem>
                      <SelectItem value="BAG">Bags (50 Kg)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="salePrice">Sale Price / Kg (EUR)</Label>
              <Input id="salePrice" type="number" step="0.01" {...register("salePrice", { valueAsNumber: true })} className="mt-1" />
              {errors.salePrice && <p className="mt-1 text-xs text-red-500">{errors.salePrice.message}</p>}
            </div>
            <div>
              <Label htmlFor="purchasePrice">Purchase Price / Kg (EUR)</Label>
              <Input id="purchasePrice" type="number" step="0.01" {...register("purchasePrice", { valueAsNumber: true })} className="mt-1" />
              {errors.purchasePrice && <p className="mt-1 text-xs text-red-500">{errors.purchasePrice.message}</p>}
            </div>
            <div>
              <Label htmlFor="lowStockThresholdKg">Low Stock Alert (Kg)</Label>
              <Input id="lowStockThresholdKg" type="number" step="1" {...register("lowStockThresholdKg", { valueAsNumber: true })} className="mt-1" />
              {errors.lowStockThresholdKg && <p className="mt-1 text-xs text-red-500">{errors.lowStockThresholdKg.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...register("notes")}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0099D6]"
            />
          </div>

          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/products")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
