export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { expenseDate: "desc" },
    take: 50,
    include: { category: true },
  });

  const totalThisMonth = await prisma.expense.aggregate({
    where: { expenseDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    _sum: { amount: true },
  });

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Expenses" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{expenses.length} records</p>
            <p className="text-xs text-gray-400">This month: <strong>{formatCurrency(totalThisMonth._sum.amount ?? 0)}</strong></p>
          </div>
          <Link href="/expenses/new" className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Log Expense
          </Link>
        </div>
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatDate(e.expenseDate)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{e.category.name}</td>
                  <td className="px-4 py-3 text-gray-500">{e.description ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{e.paymentMethod}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
