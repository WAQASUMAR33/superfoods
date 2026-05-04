"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";

interface Props {
  salesChart: { date: string; sales: number }[];
}

export function DashboardCharts({ salesChart }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>Sales - Last 7 Days</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={salesChart} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyCompact(Number(v ?? 0))} />
            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
            <Bar dataKey="sales" fill="#2563eb" radius={[0, 0, 0, 0]} name="Sales" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
