export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { purchases: true } } },
  });

  const balances = await Promise.all(
    suppliers.map(async (s) => {
      const last = await prisma.partyLedgerEntry.findFirst({
        where: { supplierId: s.id },
        orderBy: { id: "desc" },
      });
      return { id: s.id, balance: Number(last?.runningBalance ?? s.openingBalance) };
    })
  );

  const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b.balance]));

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Suppliers" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{suppliers.length} suppliers</p>
          <Link href="/suppliers/new" className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Supplier
          </Link>
        </div>
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">City</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance Due</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Purchases</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s) => {
                const balance = balanceMap[s.id] ?? 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.city ?? "-"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{s._count.purchases}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/suppliers/${s.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
