"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewSupplierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "", name: "", phone: "", city: "", address: "",
    creditTermDays: 0, creditLimit: 0, openingBalance: 0, notes: "",
  });

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        creditTermDays: Number(form.creditTermDays),
        creditLimit: Number(form.creditLimit),
        openingBalance: Number(form.openingBalance),
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/suppliers");
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error?.fieldErrors ? JSON.stringify(err.error.fieldErrors) : "Failed to save supplier");
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Add Supplier" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader><CardTitle>New Supplier</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Supplier Code *</Label>
                    <Input value={form.code} onChange={(e) => set("code", e.target.value)} required className="mt-1" placeholder="SUP-001" />
                  </div>
                  <div>
                    <Label>Supplier Name *</Label>
                    <Input value={form.name} onChange={(e) => set("name", e.target.value)} required className="mt-1" placeholder="Company name" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1" placeholder="03XX-XXXXXXX" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1" placeholder="Lahore" />
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <textarea
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0099D6]"
                    placeholder="Street address..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Credit Term (Days)</Label>
                    <Input type="number" min="0" value={form.creditTermDays} onChange={(e) => set("creditTermDays", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Credit Limit (EUR)</Label>
                    <Input type="number" min="0" step="0.01" value={form.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Opening Balance (EUR)</Label>
                    <Input type="number" step="0.01" value={form.openingBalance} onChange={(e) => set("openingBalance", e.target.value)} className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0099D6]"
                  />
                </div>

                {error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => router.push("/suppliers")}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Supplier"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
