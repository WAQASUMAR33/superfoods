"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface Settings {
  businessName: string; address: string; phone: string; ntnNumber: string;
  currency: string; invoicePrefix: string; purchasePrefix: string; lowStockDefaultKg: number;
}

const DEFAULTS: Settings = {
  businessName: "AMB Super Foods", address: "", phone: "", ntnNumber: "",
  currency: "PKR", invoicePrefix: "INV", purchasePrefix: "PUR", lowStockDefaultKg: 200,
};

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setForm({
        businessName: data.businessName ?? DEFAULTS.businessName,
        address: data.address ?? "",
        phone: data.phone ?? "",
        ntnNumber: data.ntnNumber ?? "",
        currency: data.currency ?? "PKR",
        invoicePrefix: data.invoicePrefix ?? "INV",
        purchasePrefix: data.purchasePrefix ?? "PUR",
        lowStockDefaultKg: Number(data.lowStockDefaultKg ?? 200),
      }))
      .catch(() => {});
  }, []);

  function set(field: keyof Settings, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lowStockDefaultKg: Number(form.lowStockDefaultKg) }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Failed to save settings");
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Settings" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">

          <Card>
            <CardHeader><CardTitle>Business Information</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Business Name</Label>
                    <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1" placeholder="03XX-XXXXXXX" />
                  </div>
                  <div>
                    <Label>NTN Number</Label>
                    <Input value={form.ntnNumber} onChange={(e) => set("ntnNumber", e.target.value)} className="mt-1" placeholder="0000000-0" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Address</Label>
                    <textarea
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0099D6]"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <h3 className="text-sm font-semibold text-slate-700">Invoice Settings</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Currency</Label>
                    <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} className="mt-1" placeholder="PKR" />
                  </div>
                  <div>
                    <Label>Invoice Prefix</Label>
                    <Input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} required className="mt-1" placeholder="INV" />
                  </div>
                  <div>
                    <Label>Purchase Prefix</Label>
                    <Input value={form.purchasePrefix} onChange={(e) => set("purchasePrefix", e.target.value)} required className="mt-1" placeholder="PUR" />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <h3 className="text-sm font-semibold text-slate-700">Inventory Settings</h3>
                <div className="max-w-xs">
                  <Label>Default Low Stock Alert (Kg)</Label>
                  <Input type="number" min="0" step="1" value={form.lowStockDefaultKg} onChange={(e) => set("lowStockDefaultKg", Number(e.target.value))} className="mt-1" />
                </div>

                {error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                      <CheckCircle className="h-4 w-4" /> Saved successfully
                    </span>
                  )}
                  <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
