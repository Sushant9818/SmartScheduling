"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSessions,
  updateSessionStatus,
  rescheduleSession,
  createSession,
} from "@/lib/api";
import type { CreateSessionRequest } from "@/types/session";
import type { GetSessionsParams } from "@/types/session";
import type { MockSession } from "@/lib/mockData";
import { useAuth } from "@/context/AuthProvider";
import { hasValidToken } from "@/lib/auth";

export const SESSIONS_KEY = ["sessions"] as const;

function sessionsQueryKey(params?: GetSessionsParams) {
  return [...SESSIONS_KEY, params ?? {}] as const;
}

/** Fetches sessions. Only runs when auth is ready, logged in, and token present (prevents Missing Authorization). */
export function useSessions(filters?: GetSessionsParams) {
  const { user, isLoading: authLoading } = useAuth();
  const tokenReady = hasValidToken();
  return useQuery({
    queryKey: sessionsQueryKey(filters),
    queryFn: (): Promise<MockSession[]> => getSessions(filters),
    enabled: !authLoading && !!tokenReady && !!user,
  });
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await updateSessionStatus(id, status);
      if (!res.ok) {
        throw new Error((res as { error?: string }).error ?? "Failed to update status");
      }
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
      toast.success("Session status updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update status"),
  });
}

export function useRescheduleSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      startAt,
      endAt,
    }: {
      id: string;
      startAt: string;
      endAt: string;
    }) => {
      const res = await rescheduleSession(id, { startAt, endAt });
      if (!res.ok) {
        throw new Error((res as { error?: string }).error ?? "Failed to reschedule");
      }
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
      toast.success("Session rescheduled");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to reschedule"),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSessionRequest) => {
      const res = await createSession(payload);
      if (!res.ok) {
        throw new Error((res as { error?: string }).error ?? "Failed to book session");
      }
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
      toast.success("Session booked");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to book session"),
  });
}
