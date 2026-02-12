"use client";

import { useQuery } from "@tanstack/react-query";
import { getTherapists, getAdminTherapists } from "@/lib/api";
import type { GetTherapistsParams } from "@/types/therapist";
import type { MockTherapist } from "@/lib/mockData";
import { useAuth } from "@/context/AuthProvider";

export const THERAPISTS_KEY = ["therapists"] as const;
export const ADMIN_THERAPISTS_KEY = ["admin", "therapists"] as const;

function therapistsQueryKey(params?: GetTherapistsParams) {
  return [...THERAPISTS_KEY, params ?? {}] as const;
}

export function useTherapists(filters?: GetTherapistsParams) {
  return useQuery({
    queryKey: therapistsQueryKey(filters),
    queryFn: (): Promise<MockTherapist[]> => getTherapists(filters),
  });
}

/** Admin: GET /admin/therapists (requires auth). */
export function useAdminTherapists() {
  const { user, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ADMIN_THERAPISTS_KEY,
    queryFn: (): Promise<MockTherapist[]> => getAdminTherapists(),
    enabled: !authLoading && !!user && user.role === "ADMIN",
  });
}
