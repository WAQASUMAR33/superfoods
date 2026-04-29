"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Tag } from "lucide-react";

interface Category { id: number; name: string; isActive: boolean; }

export default function ExpenseCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/expenses/categories");
    if (res.ok) setCategories(await res.json());
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/expenses/categories");
      if (!cancelled && res.ok) setCategories(await res.json());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setSaving(true);
    const res = await fetch("/api/expenses/categories/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setName("");
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error?.fieldErrors?.name?.[0] ?? "Failed to add category");
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Expense Categories" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-xl space-y-6">
          {/* Add new */}
          <Card>
            <CardHeader><CardTitle>Add New Category</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="catName">Category Name</Label>
                  <Input
                    id="catName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Packaging, Utilities…"
                    className="mt-1"
                    required
                  />
                  {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={saving}>
                    <Plus className="mr-1 h-4 w-4" />
                    {saving ? "Adding…" : "Add"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Categories</CardTitle>
                <span className="text-sm text-slate-400">{categories.length} total</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Tag className="mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm">No categories yet</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {categories.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                      <Tag className="h-4 w-4 flex-shrink-0 text-[#0099D6]" />
                      <span className="text-sm font-medium text-slate-700">{c.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => router.push("/expenses")}>
              ← Back to Expenses
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
