"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RefreshProvider } from "@/store/refresh-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RefreshProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="overflow-hidden" suppressHydrationWarning>
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4" suppressHydrationWarning>
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-sidebar-border" suppressHydrationWarning />
            <TopBar />
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto p-6" suppressHydrationWarning>{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </RefreshProvider>
  );
}
