"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { dashboardTitleFromPathname } from "@/components/layout/dashboardPathTitle";

/**
 * Sticky app bar visible only below `lg` (sidebar is drawer on mobile).
 * Per-page `<Header />` uses `desktopOnly` so titles are not duplicated on desktop.
 */
export function DashboardMobileHeader() {
  const pathname = usePathname() ?? "/";
  const title = dashboardTitleFromPathname(pathname);

  return (
    <div className="sticky top-0 z-[100] shrink-0 print:hidden lg:hidden">
      <div className="pt-[env(safe-area-inset-top,0px)]">
        <Header title={title} desktopOnly={false} />
      </div>
    </div>
  );
}
