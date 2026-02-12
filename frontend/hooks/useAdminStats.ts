"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminOverviewStats, getSessionsPerWeek } from "@/lib/api";
import { MOCK_ADMIN_OVERVIEW, MOCK_SESSIONS_PER_WEEK } from "@/lib/mockData";
import type { AdminOverviewStats, SessionsPerWeekPoint } from "@/types/stats";
import { hasValidToken } from "@/lib/auth";

export const ADMIN_STATS_OVERVIEW_KEY = ["admin", "stats", "overview"] as const;
export const ADMIN_SESSIONS_PER_WEEK_KEY = ["admin", "stats", "sessions-per-week"] as const;

/** Admin stats. Only runs when enabled (e.g. enabled: hasValidToken() && user?.role === "ADMIN"). Prevents 401 before auth. */
export function useAdminStats(weeks: number = 8, enabled: boolean = false) {
  const overview = useQuery({
    queryKey: ADMIN_STATS_OVERVIEW_KEY,
    queryFn: async () => {
      const res = await getAdminOverviewStats();
      if (res.ok) return res.data as AdminOverviewStats;
      if (res.status === 404) return MOCK_ADMIN_OVERVIEW as AdminOverviewStats;
      throw new Error(res.error ?? "Failed to load stats");
    },
    enabled,
    retry: false,
  });

  const sessionsPerWeek = useQuery({
    queryKey: [...ADMIN_SESSIONS_PER_WEEK_KEY, weeks],
    queryFn: async () => {
      const res = await getSessionsPerWeek(weeks);
      if (res.ok) return (res.data ?? []) as SessionsPerWeekPoint[];
      if (res.status === 404) return MOCK_SESSIONS_PER_WEEK as SessionsPerWeekPoint[];
      throw new Error(res.error ?? "Failed to load sessions per week");
    },
    enabled,
    retry: false,
  });

  return {
    overview,
    sessionsPerWeek,
    isLoading: overview.isLoading || sessionsPerWeek.isLoading,
    isError: overview.isError || sessionsPerWeek.isError,
  };
}
