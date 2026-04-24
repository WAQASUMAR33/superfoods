export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";

export default async function SalesPage() {
  const sales = await prisma.sale.findMany({
    orderBy: { saleDate: "desc" },
    take: 50,
    include: { customer: true, user: true, _count: { select: { items: true } } },
  });

  const statusVariant: Record<string, "success" | "warning" | "destructive" | "default"> = {
    COMPLETED: "success",
    CREDIT: "warning",
    PARTIALLY_PAID: "default",
    RETURNED: "destructive",
  };

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Sales History" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{sales.length} sales</p>
          <Link href="/pos" className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            <ShoppingCart className="h-4 w-4" /> New Sale (POS)
          </Link>
        </div>
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Items</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{s.invoiceNo}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.customer?.name ?? "Walk-in"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(s.saleDate)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{s._count.items}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(s.paidAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[s.status]}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/sales/${s.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
