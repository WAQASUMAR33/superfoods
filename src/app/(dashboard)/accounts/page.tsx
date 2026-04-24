export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
const TYPE_COLORS: Record<string, string> = {
  ASSET:     "bg-blue-100 text-blue-700",
  LIABILITY: "bg-rose-100 text-rose-700",
  EQUITY:    "bg-violet-100 text-violet-700",
  INCOME:    "bg-emerald-100 text-emerald-700",
  EXPENSE:   "bg-amber-100 text-amber-700",
};

async function getAccountsWithBalances() {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
    include: { lines: { select: { type: true, amount: true } } },
  });

  return accounts.map((a) => {
    let balance = 0;
    for (const l of a.lines) {
      const amt = Number(l.amount);
      if (l.type === "DEBIT") {
        balance += ["ASSET", "EXPENSE"].includes(a.type) ? amt : -amt;
      } else {
        balance += ["LIABILITY", "EQUITY", "INCOME"].includes(a.type) ? amt : -amt;
      }
    }
    return { ...a, balance, txCount: a.lines.length };
  });
}

export default async function AccountsPage() {
  const accounts = await getAccountsWithBalances();

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    accounts: accounts.filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0);

  return (
    <div className="flex flex-col overflow-hidden">
      <Header title="Chart of Accounts" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">{accounts.length} accounts</p>
          <Link
            href="/accounts/new"
            className="flex items-center gap-1.5 rounded-lg bg-[#0099D6] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-[#0099D6]/25 transition hover:bg-[#007AB8]"
          >
            <Plus className="h-4 w-4" /> Add Account
          </Link>
        </div>

        <div className="space-y-6">
          {grouped.map(({ type, accounts: accs }) => (
            <div key={type} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[type]}`}>
                  {type}
                </span>
                <span className="text-sm text-slate-400">{accs.length} accounts</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Code</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Account Name</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Transactions</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {accs.map((a) => (
                    <tr key={a.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{a.code}</td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-800">{a.name}</span>
                        {a.isSystem && (
                          <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">system</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center text-slate-500">{a.txCount}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${a.balance >= 0 ? "text-slate-800" : "text-red-600"}`}>
                        {formatCurrency(Math.abs(a.balance))}
                        {a.balance < 0 && <span className="ml-1 text-xs text-red-400">CR</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
