"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "@/lib/api";
import { hasValidToken } from "@/lib/auth";
import type { GetAvailabilityParams, UpdateAvailabilityPayload } from "@/types/availability";
import type { MockAvailability } from "@/lib/mockData";
import { useAuth } from "@/context/AuthProvider";

export const AVAILABILITY_KEY = ["availability"] as const;

function availabilityQueryKey(params?: GetAvailabilityParams) {
  return [...AVAILABILITY_KEY, params ?? {}] as const;
}

/**
 * - Therapist: useAvailability() with no params → backend uses token for own slots.
 * - Admin: useAvailability({ therapistId }) → that therapist's slots.
 */
export function useAvailability(params?: GetAvailabilityParams) {
  const { user, isLoading: authLoading } = useAuth();
  const enabled = !authLoading && (hasValidToken() || !!user);
  return useQuery({
    queryKey: availabilityQueryKey(params),
    queryFn: (): Promise<MockAvailability[]> => getAvailability(params),
    enabled,
  });
}

export function useCreateAvailability(therapistId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      dayOfWeek: number | string;
      startTime: string;
      endTime: string;
      recurring?: boolean;
    }) => createAvailability({ ...payload, therapistId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AVAILABILITY_KEY });
      toast.success("Availability added");
    },
    onError: (err: Error) => {
      const msg = err.message ?? "";
      if (msg.includes("Unauthorized") || msg.includes("401") || msg.includes("Access token expired")) {
        toast.error("Log in with your backend account to add availability.");
      } else if (msg.includes("Therapist profile not found") || msg.includes("403") || msg.includes("Forbidden")) {
        toast.error("Therapist profile not set up. Ask an admin to create your therapist profile.");
      } else if (msg.includes("overlaps")) {
        toast.error("This slot overlaps with an existing one.");
      } else {
        toast.error(msg || "Failed to add availability");
      }
    },
  });
}

export function useUpdateAvailability(therapistId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, payload }: { slotId: string; payload: UpdateAvailabilityPayload }) =>
      updateAvailability(slotId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AVAILABILITY_KEY });
      toast.success("Availability updated");
    },
    onError: (err: Error) => {
      if ((err.message ?? "").includes("overlaps")) toast.error("This slot overlaps with an existing one.");
      else toast.error(err.message ?? "Failed to update availability");
    },
  });
}

export function useDeleteAvailability(therapistId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAvailability,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AVAILABILITY_KEY });
      toast.success("Availability removed");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to remove availability"),
  });
}
