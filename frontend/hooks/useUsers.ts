"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
} from "@/lib/api";
import type { AdminUsersParams } from "@/lib/api";
import type { MockUser } from "@/lib/mockData";
import { useAuth } from "@/context/AuthProvider";

export const USERS_KEY = ["admin", "users"] as const;

function usersQueryKey(params?: AdminUsersParams) {
  return [...USERS_KEY, params ?? {}] as const;
}

/** Admin-only. GET /admin/users with optional ?role=&q= */
export function useAdminUsers(params?: AdminUsersParams) {
  const { user, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: (): Promise<MockUser[]> => adminGetUsers(params),
    enabled: !authLoading && !!user && user.role === "ADMIN",
  });
}

/** Alias for Admin Users page. */
export function useUsers(params?: AdminUsersParams) {
  return useAdminUsers(params);
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password: string;
      role: "admin" | "therapist" | "client";
    }) => {
      const res = await adminCreateUser(payload);
      if (!res.ok) throw new Error(res.error ?? "Failed to create user");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User created");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create user"),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; email?: string; role?: "admin" | "therapist" | "client" };
    }) => {
      const res = await adminUpdateUser(id, payload);
      if (!res.ok) throw new Error(res.error ?? "Failed to update user");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update user"),
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await adminDeleteUser(id, true);
      if (!res.ok) throw new Error(res.error ?? "Failed to delete user");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete user"),
  });
}
