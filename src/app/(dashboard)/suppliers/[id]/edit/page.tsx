"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessageFromFetchResponse } from "@/lib/httpErrorMessage";

interface SupplierFormState {
  code: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  creditTermDays: number;
  creditLimit: number;
  openingBalance: number;
  notes: string;
}

const EMPTY_FORM: SupplierFormState = {
  code: "",
  name: "",
  phone: "",
  city: "",
  address: "",
  creditTermDays: 0,
  creditLimit: 0,
  openingBalance: 0,
  notes: "",
};

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supplierId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM);

  useEffect(() => {
    async function loadSupplier() {
      if (!supplierId || Number.isNaN(supplierId)) {
        setError("Invalid supplier ID.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/suppliers/${supplierId}`);
        if (!res.ok) {
          const message = await errorMessageFromFetchResponse(res);
          setError(message);
          setLoading(false);
          return;
        }
        const supplier = await res.json();
        setForm({
          code: supplier.code ?? "",
          name: supplier.name ?? "",
          phone: supplier.phone ?? "",
          city: supplier.city ?? "",
          address: supplier.address ?? "",
          creditTermDays: Number(supplier.creditTermDays ?? 0),
          creditLimit: Number(supplier.creditLimit ?? 0),
          openingBalance: Number(supplier.openingBalance ?? 0),
          notes: supplier.notes ?? "",
        });
      } catch {
        setError("Failed to load supplier.");
      } finally {
        setLoading(false);
      }
    }
    loadSupplier();
  }, [supplierId]);

  function set(field: keyof SupplierFormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          creditTermDays: Number(form.creditTermDays),
          creditLimit: Number(form.creditLimit),
          openingBalance: Number(form.openingBalance),
        }),
      });
      if (res.ok) {
        router.push(`/suppliers/${supplierId}`);
        return;
      }
      const message = await errorMessageFromFetchResponse(res);
      setError(message);
    } catch {
      setError("Network error - try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Edit Supplier" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Update Supplier</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Loading supplier...</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Supplier Code *</Label>
                      <Input value={form.code} onChange={(e) => set("code", e.target.value)} required className="mt-1" />
                    </div>
                    <div>
                      <Label>Supplier Name *</Label>
                      <Input value={form.name} onChange={(e) => set("name", e.target.value)} required className="mt-1" />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label>Address</Label>
                    <textarea
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0099D6]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label>Credit Term (Days)</Label>
                      <Input type="number" min="0" value={form.creditTermDays} onChange={(e) => set("creditTermDays", e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Credit Limit</Label>
                      <Input type="number" min="0" step="0.01" value={form.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Opening Balance</Label>
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
                    <Button type="button" variant="outline" onClick={() => router.push(`/suppliers/${supplierId}`)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving || loading}>
                      {saving ? "Saving..." : "Update Supplier"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
