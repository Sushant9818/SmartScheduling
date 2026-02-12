"use client";

import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api";

export const AUTH_ME_KEY = ["auth", "me"] as const;

export function useMe() {
  return useQuery({
    queryKey: AUTH_ME_KEY,
    queryFn: async () => {
      const res = await getMe();
      if (!res.ok) throw new Error(res.error ?? "Failed to load user");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
