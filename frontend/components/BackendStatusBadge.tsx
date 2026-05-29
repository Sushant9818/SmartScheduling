"use client";

import { useHealth } from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL, isProductionApiMisconfigured } from "@/lib/config";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Shows backend status (Connected / Disconnected). Safe when backend is offline:
 * useHealth has retry: false, so no request loop; we only render badge states.
 */
export function BackendStatusBadge() {
  const { data, isPending, isError } = useHealth();
  const connected =
    !isPending &&
    !isError &&
    typeof data?.status === "string" &&
    data.status.toLowerCase() === "ok";

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

  const misconfigured = isProductionApiMisconfigured();
  const hint = misconfigured
    ? "Set VITE_API_URL (or NEXT_PUBLIC_API_BASE_URL) on Vercel to https://YOUR-SERVICE.onrender.com/api and redeploy."
    : `Cannot reach API at ${API_BASE_URL || "(not set)"}. Start backend locally on :5000 or point VITE_API_URL to Render.`;

  return (
    <Badge
      variant="destructive"
      className="gap-1 max-w-[280px] truncate"
      title={hint}
    >
      <WifiOff className="h-3 w-3 shrink-0" />
      Disconnected
    </Badge>
  );
}
