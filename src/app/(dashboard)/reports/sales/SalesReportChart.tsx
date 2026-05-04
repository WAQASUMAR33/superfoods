"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { APP_LOCALE } from "@/config/locale";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";

interface Props { sales: { date: string; amount: number }[]; }

export function SalesReportChart({ sales }: Props) {
  const byDate: Record<string, number> = {};
  for (const s of sales) {
    byDate[s.date] = (byDate[s.date] ?? 0) + s.amount;
  }
  const data = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, amount]) => ({
    date: new Date(date).toLocaleDateString(APP_LOCALE, { month: "short", day: "numeric" }),
    amount,
  }));

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Daily Sales</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrencyCompact(Number(v ?? 0))} />
          <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
          <Bar dataKey="amount" fill="#2563eb" radius={[3, 3, 0, 0]} name="Sales" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
