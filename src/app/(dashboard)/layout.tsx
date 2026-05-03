import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import SessionProvider from "@/components/layout/SessionProvider";
import { SidebarProvider } from "@/components/layout/SidebarContext";

import { authOptions } from "@/lib/auth";

/** Session must never be statically cached — otherwise first visit after login can see a stale empty session. */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-slate-50">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
        </div>
      </SidebarProvider>
    </SessionProvider>
  );
}
