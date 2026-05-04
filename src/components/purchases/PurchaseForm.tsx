"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UNIT_OPTIONS, Unit, toKg } from "@/lib/units";
import { errorMessageFromFetchResponse } from "@/lib/httpErrorMessage";
import { formatCurrency } from "@/lib/utils";

interface Supplier { id: number; name: string; }
interface Product { id: number; code: string; name: string; purchasePrice: number; defaultUnit: string; }

interface LineItem {
  productId: number;
  displayUnit: Unit;
  displayQty: number;
  unitCostKg: number;
}

export function PurchaseForm({ suppliers, products }: { suppliers: Supplier[]; products: Product[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: 0, displayUnit: "KG", displayQty: 1, unitCostKg: 0 }]);
  const [form, setForm] = useState({
    invoiceNo: "",
    supplierId: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    discount: 0,
    vehicleNo: "",
    paymentMethod: "CASH",
    paidAmount: 0,
    paymentReference: "",
  });

  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: field === "productId" ? Number(value) : value };
      if (field === "productId") {
        const p = products.find((p) => p.id === Number(value));
        if (p) updated.unitCostKg = p.purchasePrice;
      }
      return updated;
    }));
  }

  const subtotal = items.reduce((sum, it) => sum + toKg(it.displayQty, it.displayUnit) * it.unitCostKg, 0) - form.discount;

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    const supplierId = Number(form.supplierId);
    const lineItems = items.filter((i) => i.productId > 0);
    if (!form.supplierId || Number.isNaN(supplierId) || supplierId < 1) {
      setError("Please select a supplier.");
      return;
    }
    if (lineItems.length === 0) {
      setError("Add at least one product line.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          supplierId,
          discount: Number(form.discount),
          paidAmount: form.paymentMethod === "CREDIT" ? 0 : Number(form.paidAmount),
          items: lineItems,
        }),
      });

      // Do not use `res.json()` — error responses may have an empty body (crashes on JSON parse).
      if (res.ok) {
        router.push("/purchases");
        return;
      }

      const message = await errorMessageFromFetchResponse(res);
      setError(message);
    } catch {
      setError("Network error — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Purchase Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Supplier Invoice No.</Label>
            <Input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} required className="mt-1" placeholder="SUP-2024-001" />
          </div>
          <div>
            <Label>Purchase Date</Label>
            <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Supplier</Label>
            <Select onValueChange={(v) => setForm({ ...form, supplierId: v })} required>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vehicle No.</Label>
            <Input value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })} className="mt-1" placeholder="ABC-1234" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, { productId: 0, displayUnit: "KG", displayQty: 1, unitCostKg: 0 }])}>
              <Plus className="mr-1 h-4 w-4" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium uppercase text-gray-500 sm:grid">
            <span className="col-span-4">Product</span>
            <span className="col-span-2">Unit</span>
            <span className="col-span-2">Quantity</span>
            <span className="col-span-2">Cost/Kg</span>
            <span className="col-span-1 text-right">Total</span>
            <span />
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-4">
                <select value={item.productId} onChange={(e) => updateItem(idx, "productId", e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value={0}>Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <select value={item.displayUnit} onChange={(e) => updateItem(idx, "displayUnit", e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.value}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Input type="number" step="0.001" min="0.001" value={item.displayQty}
                  onChange={(e) => updateItem(idx, "displayQty", Number(e.target.value))} />
              </div>
              <div className="col-span-2">
                <Input type="number" step="0.01" min="0" value={item.unitCostKg}
                  onChange={(e) => updateItem(idx, "unitCostKg", Number(e.target.value))} />
              </div>
              <div className="col-span-1 text-right text-sm font-medium">
                {formatCurrency(toKg(item.displayQty, item.displayUnit) * item.unitCostKg)}
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Discount (EUR)</Label>
                <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className="w-28" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-[#0099D6]">{formatCurrency(subtotal)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Payment Method</Label>
            <Select onValueChange={(v) => setForm({ ...form, paymentMethod: v })} defaultValue="CASH">
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="CREDIT">Credit (Add to Ledger)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.paymentMethod !== "CREDIT" && (
            <div>
              <Label>Amount Paid Now</Label>
              <Input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })} className="mt-1" />
            </div>
          )}
          <div>
            <Label>Payment Reference</Label>
            <Input value={form.paymentReference} onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} placeholder="Cheque/TXN no." className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/purchases")}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Record Purchase"}</Button>
      </div>
    </form>
  );
}
