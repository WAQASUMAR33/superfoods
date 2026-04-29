"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;

type AccountOption = { id: number; code: string; name: string; type: string };

export default function NewAccountPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<AccountOption[]>([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "" as (typeof ACCOUNT_TYPES)[number] | "",
    parentId: "" as "" | string,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/accounts");
      if (!cancelled && res.ok) {
        const data: AccountOption[] = await res.json();
        setExisting(Array.isArray(data) ? data : []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.type) {
      setError("Select an account type.");
      return;
    }
    setSaving(true);
    const body: {
      code: string;
      name: string;
      type: (typeof ACCOUNT_TYPES)[number];
      parentId?: number;
    } = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
    };
    if (form.parentId && form.parentId !== "0") {
      const pid = Number(form.parentId);
      if (!Number.isNaN(pid)) body.parentId = pid;
    }

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/accounts");
      return;
    }
    const err = await res.json().catch(() => ({}));
    const msg =
      err?.error && typeof err.error === "object"
        ? JSON.stringify(err.error)
        : typeof err?.error === "string"
          ? err.error
          : "Failed to create account";
    setError(msg);
  }

  const parentOptions = existing.filter((a) =>
    form.type ? a.type === form.type : true
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header title="Add Account" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>New chart of accounts entry</CardTitle>
              <p className="text-sm text-slate-500">
                System accounts cannot be created here; link a parent if this account rolls up under another.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="acc-type">Account type *</Label>
                    <Select
                      value={form.type || undefined}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, type: v as (typeof ACCOUNT_TYPES)[number], parentId: "" }))
                      }
                    >
                      <SelectTrigger id="acc-type" className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.charAt(0) + t.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="acc-code">Code *</Label>
                    <Input
                      id="acc-code"
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      required
                      className="mt-1"
                      placeholder="e.g. 1200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="acc-name">Account name *</Label>
                    <Input
                      id="acc-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      className="mt-1"
                      placeholder="Display name"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="acc-parent">Parent account (optional)</Label>
                    <Select
                      value={form.parentId || "0"}
                      onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
                      disabled={!form.type}
                    >
                      <SelectTrigger id="acc-parent" className="mt-1">
                        <SelectValue placeholder={form.type ? "None (top-level)" : "Choose type first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None (top-level)</SelectItem>
                        {parentOptions.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error !== "" && (
                  <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/accounts">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Create account"}
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
