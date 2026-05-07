"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessageFromFetchResponse } from "@/lib/httpErrorMessage";

interface CustomerFormState {
  code: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  creditLimit: number;
  openingBalance: number;
  notes: string;
}

const EMPTY_FORM: CustomerFormState = {
  code: "",
  name: "",
  phone: "",
  city: "",
  address: "",
  creditLimit: 0,
  openingBalance: 0,
  notes: "",
};

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);

  useEffect(() => {
    async function loadCustomer() {
      if (!customerId || Number.isNaN(customerId)) {
        setError("Invalid customer ID.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        if (!res.ok) {
          const message = await errorMessageFromFetchResponse(res);
          setError(message);
          setLoading(false);
          return;
        }
        const customer = await res.json();
        setForm({
          code: customer.code ?? "",
          name: customer.name ?? "",
          phone: customer.phone ?? "",
          city: customer.city ?? "",
          address: customer.address ?? "",
          creditLimit: Number(customer.creditLimit ?? 0),
          openingBalance: Number(customer.openingBalance ?? 0),
          notes: customer.notes ?? "",
        });
      } catch {
        setError("Failed to load customer.");
      } finally {
        setLoading(false);
      }
    }
    loadCustomer();
  }, [customerId]);

  function set(field: keyof CustomerFormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          creditLimit: Number(form.creditLimit),
          openingBalance: Number(form.openingBalance),
        }),
      });
      if (res.ok) {
        router.push(`/customers/${customerId}`);
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
      <Header title="Edit Customer" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Update Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Loading customer...</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Customer Code *</Label>
                      <Input value={form.code} onChange={(e) => set("code", e.target.value)} required className="mt-1" />
                    </div>
                    <div>
                      <Label>Customer Name *</Label>
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <Button type="button" variant="outline" onClick={() => router.push(`/customers/${customerId}`)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving || loading}>
                      {saving ? "Saving..." : "Update Customer"}
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
