"use client";

import { useHealth } from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Shows backend status (Connected / Disconnected). Safe when backend is offline:
 * useHealth has retry: false, so no request loop; we only render badge states.
 */
export function BackendStatusBadge() {
  const { data, isPending, isError } = useHealth();
  const connected = !isPending && !isError && data?.status === "ok";

  if (isPending) {
    return (
      <Badge variant="secondary" className="gap-1" title="Checking backend…">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
        Checking…
      </Badge>
    );
  }

  if (connected) {
    return (
      <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700" title="Backend Connected">
        <Wifi className="h-3 w-3" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1" title="Backend Disconnected">
      <WifiOff className="h-3 w-3" />
      Disconnected
    </Badge>
  );
}
