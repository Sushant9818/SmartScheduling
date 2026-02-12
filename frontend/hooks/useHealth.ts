"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api";

export const HEALTH_KEY = ["health"] as const;

/**
 * Backend health check. GET /api/health.
 * - retry: false so we do not loop when backend is down.
 * - When backend is offline, query fails and UI shows "Disconnected" badge; rendering is not broken.
 */
export function useHealth() {
  return useQuery({
    queryKey: HEALTH_KEY,
    queryFn: async () => {
      const res = await getHealth();
      if (!res.ok) throw new Error(res.error ?? "Unhealthy");
      return res.data;
    },
    staleTime: 30 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  });
}
