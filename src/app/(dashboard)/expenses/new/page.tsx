"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";

interface Category {
  id: number;
  name: string;
}

function safeErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const e = (payload as { error?: unknown }).error;
    if (typeof e === "string") return e;
    return JSON.stringify(e);
  }
  return `Could not save expense (${status})`;
}

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categoryId: "",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "CASH",
    reference: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/expenses/categories");
        const data = (await r.json()) as Category[] | { error?: string };
        if (!r.ok || !Array.isArray(data)) {
          if (r.status === 401 && typeof window !== "undefined") {
            const next = `${window.location.origin}/expenses/new`;
            router.replace(`/login?callbackUrl=${encodeURIComponent(next)}`);
            return;
          }
          if (!cancelled) {
            const msg =
              !Array.isArray(data) && data && typeof data === "object" && "error" in data
                ? String((data as { error?: string }).error)
                : "Could not load categories.";
            setLoadError(msg);
            setCategories([]);
          }
          return;
        }
        if (!cancelled) {
          setCategories(data);
          setLoadError("");
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load categories.");
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    const categoryNum = Number(form.categoryId);
    if (!form.categoryId || Number.isNaN(categoryNum)) {
      setSubmitError("Please select an expense category.");
      return;
    }
    const amountNum = Number(form.amount);
    if (Number.isNaN(amountNum) || amountNum < 0.01) {
      setSubmitError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: categoryNum,
          amount: amountNum,
        }),
      });
      const payload = await res.json().catch(() => ({}));

      if (res.ok) {
        router.push("/expenses");
        return;
      }
      setSubmitError(safeErrorMessage(payload, res.status));
    } catch {
      setSubmitError("Network error — try again.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !loadingCategories && categories.length > 0 && !!form.categoryId;

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Log Expense" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>New Expense</CardTitle>
            </CardHeader>
            <CardContent>
              {(loadError || loadingCategories) && (
                <p className="mb-4 text-sm text-amber-600">
                  {loadingCategories ? "Loading categories…" : loadError}
                </p>
              )}
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      disabled={categories.length === 0}
                      value={form.categoryId || undefined}
                      onValueChange={(v) => setForm({ ...form, categoryId: v })}
                      required
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={categories.length ? "Select category" : "No categories"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={form.expenseDate}
                      onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Amount (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1"
                    placeholder="Details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      defaultValue="CASH"
                      value={form.paymentMethod}
                      onValueChange={(v) => setForm({ ...form, paymentMethod: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reference</Label>
                    <Input
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                {submitError && (
                  <p className="text-sm font-medium text-red-600">{submitError}</p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => router.push("/expenses")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !canSubmit}>
                    {saving ? "Saving…" : "Log Expense"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
