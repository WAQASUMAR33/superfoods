"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { useEffect } from "react";

interface Category { id: number; name: string; }

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categoryId: "", amount: "", description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "CASH", reference: "",
  });

  useEffect(() => {
    fetch("/api/expenses/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, categoryId: Number(form.categoryId), amount: Number(form.amount) }),
    });
    setSaving(false);
    if (res.ok) router.push("/expenses");
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Log Expense" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader><CardTitle>New Expense</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select onValueChange={(v) => setForm({ ...form, categoryId: v })} required>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Amount (PKR)</Label>
                  <Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" placeholder="Details..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Method</Label>
                    <Select onValueChange={(v) => setForm({ ...form, paymentMethod: v })} defaultValue="CASH">
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reference</Label>
                    <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => router.push("/expenses")}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Log Expense"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
