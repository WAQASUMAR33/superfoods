"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck, BarChart3,
  DollarSign, Receipt, Wallet, Settings, LogOut, Wheat, TrendingUp, X, Tag,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";

type NavItem =
  | { divider: true; label: string }
  | { divider?: false; label: string; href: string; icon: React.ComponentType<{ className?: string }> };

const nav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { divider: true, label: "Inventory" },
  { label: "Products", href: "/products", icon: Wheat },
  { label: "Stock Levels", href: "/stock", icon: Package },
  { divider: true, label: "Procurement" },
  { label: "Purchases", href: "/purchases", icon: Truck },
  { label: "Suppliers", href: "/suppliers", icon: Users },
  { divider: true, label: "Sales" },
  { label: "Sales History", href: "/sales", icon: Receipt },
  { label: "Customers", href: "/customers", icon: Users },
  { divider: true, label: "Finance" },
  { label: "Accounts", href: "/accounts", icon: DollarSign },
  { label: "Expenses", href: "/expenses", icon: Wallet },
  { label: "Expense Categories", href: "/expenses/categories", icon: Tag },
  { divider: true, label: "Reports" },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "P&L", href: "/reports/profit-loss", icon: TrendingUp },
];

function SidebarInner({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-[#020d1f] text-white">
      {/* Logo */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/5 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-white p-0.5 shadow-lg shadow-[#0099D6]/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/amb_logo.png" alt="AMB" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none tracking-tight">AMB</p>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-[#0099D6]">Super Foods</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {nav.map((item, idx) => {
          if ("divider" in item && item.divider) {
            return (
              <p
                key={idx}
                className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500"
              >
                {item.label}
              </p>
            );
          }
          if (!("href" in item)) return null;
          const Icon = item.icon!;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                active
                  ? "bg-[#0099D6] text-white shadow-lg shadow-[#0099D6]/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  active ? "text-white" : "text-slate-500"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/5 p-2">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
        >
          <Settings className="h-4 w-4 text-slate-500" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export function Sidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Desktop — always visible */}
      <div className="hidden h-screen w-64 flex-shrink-0 lg:flex">
        <SidebarInner />
      </div>

      {/* Mobile — slide-over drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <div className="absolute inset-y-0 left-0 flex w-64">
            <SidebarInner onClose={close} />
          </div>
        </div>
      )}
    </>
  );
}
