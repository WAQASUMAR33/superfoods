export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function PurchasesPage() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { purchaseDate: "desc" },
    take: 50,
    include: { supplier: true, user: true },
  });

  const statusVariant: Record<string, "success" | "warning" | "destructive" | "default"> = {
    PAID: "success",
    PARTIALLY_PAID: "warning",
    RECEIVED: "default",
    CANCELLED: "destructive",
  };

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Purchases" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{purchases.length} records</p>
          <Link href="/purchases/new" className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New Purchase
          </Link>
        </div>
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{p.internalRef}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.invoiceNo}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.supplier.name}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.purchaseDate)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.totalAmount)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${Number(p.balanceDue) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(p.balanceDue)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/purchases/${p.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
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
