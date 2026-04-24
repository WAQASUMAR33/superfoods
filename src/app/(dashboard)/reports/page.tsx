export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { BarChart3, TrendingUp, Package, BookOpen, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reports = [
  { href: "/reports/sales", icon: BarChart3, label: "Sales Report", desc: "Daily, weekly, monthly summaries by product or customer", color: "bg-blue-50 text-blue-600" },
  { href: "/reports/purchases", icon: TrendingUp, label: "Purchase Report", desc: "Procurement costs and supplier trends", color: "bg-purple-50 text-purple-600" },
  { href: "/reports/stock", icon: Package, label: "Stock Valuation", desc: "Current inventory value at weighted average cost", color: "bg-green-50 text-green-600" },
  { href: "/reports/ledger", icon: BookOpen, label: "Ledger Report", desc: "Statement of accounts for any customer or supplier", color: "bg-orange-50 text-orange-600" },
  { href: "/reports/profit-loss", icon: DollarSign, label: "Profit & Loss", desc: "Income statement for selected period", color: "bg-red-50 text-red-600" },
];

export default function ReportsHubPage() {
  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Reports" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.href} href={r.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5 flex gap-4 items-start">
                    <div className={`rounded-lg p-3 ${r.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{r.label}</h3>
                      <p className="mt-1 text-sm text-gray-500">{r.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
