"use client";

import { useSession, signOut } from "next-auth/react";
import { Bell, Menu, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSidebar } from "./SidebarContext";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const { toggle } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  const role = (session?.user as { role?: string })?.role ?? "";

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-800 sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <button className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-100"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#0099D6] to-[#0072A3] text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-none text-slate-700">
                {session?.user?.name ?? "User"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">{role}</p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-1 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-xs font-semibold text-slate-700">
                  {session?.user?.name ?? "User"}
                </p>
                <p className="text-[10px] text-slate-400">{role}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
