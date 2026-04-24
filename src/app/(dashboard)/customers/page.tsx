export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { sales: true } } },
  });

  const balances = await Promise.all(
    customers.map(async (c) => {
      const last = await prisma.partyLedgerEntry.findFirst({
        where: { customerId: c.id },
        orderBy: { id: "desc" },
      });
      return { id: c.id, balance: Number(last?.runningBalance ?? c.openingBalance) };
    })
  );
  const balanceMap = Object.fromEntries(balances.map((b) => [b.id, b.balance]));

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Customers" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{customers.length} customers</p>
          <Link href="/customers/new" className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Customer
          </Link>
        </div>
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Credit Limit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance Due</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Sales</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => {
                const balance = balanceMap[c.id] ?? 0;
                const creditUsed = balance / Number(c.creditLimit || 1) * 100;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(c.creditLimit)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${balance > 0 ? "text-orange-600" : "text-green-600"}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{c._count.sales}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/customers/${c.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
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
