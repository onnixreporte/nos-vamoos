"use client";

import { Button } from "@/components/ui/button";
import { useRefreshContext } from "@/store/refresh-context";
import { RefreshCw } from "lucide-react";

export function TopBar() {
  const { triggerRefresh } = useRefreshContext();

  return (
    <div className="flex flex-1 items-center justify-between" suppressHydrationWarning>
      <h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => triggerRefresh()}
          aria-label="Actualizar datos"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only md:not-sr-only md:ml-2">Actualizar</span>
        </Button>
      </div>
    </div>
  );
}
