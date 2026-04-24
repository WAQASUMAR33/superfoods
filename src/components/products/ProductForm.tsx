"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FormSchema = z.object({
  code: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  brandId: z.number().optional(),
  defaultUnit: z.enum(["KG", "MAUND", "BAG"]),
  salePrice: z.number().min(0),
  purchasePrice: z.number().min(0),
  lowStockThresholdKg: z.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

interface Props {
  brands: { id: number; name: string }[];
  product?: {
    id: number; code: string; name: string; variety: string;
    brandId?: number | null; defaultUnit: string;
    salePrice: unknown; purchasePrice: unknown; lowStockThresholdKg: unknown;
    notes?: string | null;
  };
}

export function ProductForm({ brands, product }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!product;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: product ? {
      code: product.code,
      name: product.name,
      brandId: product.brandId ?? undefined,
      defaultUnit: product.defaultUnit as "KG" | "MAUND" | "BAG",
      salePrice: Number(product.salePrice),
      purchasePrice: Number(product.purchasePrice),
      lowStockThresholdKg: Number(product.lowStockThresholdKg),
      notes: product.notes ?? undefined,
    } : {
      defaultUnit: "KG",
      salePrice: 0,
      purchasePrice: 0,
      lowStockThresholdKg: 200,
    },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    setError("");
    const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, variety: product?.variety ?? "General" }),
    });

    setSaving(false);
    if (res.ok) {
      router.push("/products");
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Failed to save product");
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Brand</Label>
              <Select onValueChange={(v) => setValue("brandId", Number(v))} defaultValue={product?.brandId?.toString()}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Unit</Label>
              <Select onValueChange={(v) => setValue("defaultUnit", v as "KG" | "MAUND" | "BAG")} defaultValue={product?.defaultUnit ?? "KG"}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">Kilograms (Kg)</SelectItem>
                  <SelectItem value="MAUND">Maunds (40 Kg)</SelectItem>
                  <SelectItem value="BAG">Bags (50 Kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="salePrice">Sale Price / Kg (PKR)</Label>
              <Input id="salePrice" type="number" step="0.01" {...register("salePrice", { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="purchasePrice">Purchase Price / Kg (PKR)</Label>
              <Input id="purchasePrice" type="number" step="0.01" {...register("purchasePrice", { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lowStockThresholdKg">Low Stock Alert (Kg)</Label>
              <Input id="lowStockThresholdKg" type="number" step="1" {...register("lowStockThresholdKg", { valueAsNumber: true })} className="mt-1" />
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
            <Button type="button" variant="outline" onClick={() => router.push("/products")}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
