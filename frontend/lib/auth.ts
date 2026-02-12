/**
 * Auth storage and helpers.
 * Store in localStorage: token, role, userId, userName, userEmail.
 */

import type { Role } from "@/types/auth";
export type { Role } from "@/types/auth";

/** Token key "accessToken" – same key used by http.ts for Authorization: Bearer header. */
export const STORAGE_KEYS = {
  token: "accessToken",
  role: "scheduling_role",
  userId: "scheduling_userId",
  userName: "scheduling_userName",
  userEmail: "scheduling_userEmail",
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function getRole(): Role | null {
  if (!isBrowser()) return null;
  const r = localStorage.getItem(STORAGE_KEYS.role);
  return r === "ADMIN" || r === "THERAPIST" || r === "CLIENT" ? r : null;
}

export function getUserId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORAGE_KEYS.userId);
}

export function getUserName(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORAGE_KEYS.userName);
}

export function getUserEmail(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORAGE_KEYS.userEmail);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/** True if we have a token that should be sent to the API (not mock, not empty, not expired). Use for React Query enabled guards. */
export function hasValidToken(): boolean {
  if (!isBrowser()) return false;
  const t = localStorage.getItem(STORAGE_KEYS.token);
  if (!t || typeof t !== "string" || t.trim() === "" || t.startsWith("mock-jwt-") || t === "undefined") return false;
  return !isTokenExpired(t);
}

/** Decode JWT payload (no verify). Returns { exp } or null. */
function decodeTokenPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    return payload;
  } catch {
    return null;
  }
}

/** True if token is expired (exp in past, with 10s buffer). Use to avoid calling /me with expired token. */
export function isTokenExpired(token: string): boolean {
  if (!token || token.startsWith("mock-jwt-")) return false;
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp < nowSec - 10;
}

/** Token expiry as ISO string (dev only). Returns null if not decodable. */
export function getTokenExpiryISO(token: string): string | null {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") return null;
  return new Date(payload.exp * 1000).toISOString();
}

export interface AuthUser {
  userId: string;
  role: Role;
  userName: string;
  userEmail: string;
}

export function getAuthUser(): AuthUser | null {
  const userId = getUserId();
  const role = getRole();
  const userName = getUserName();
  const userEmail = getUserEmail();
  if (!userId || !role) return null;
  return {
    userId,
    role,
    userName: userName ?? "",
    userEmail: userEmail ?? "",
  };
}

export function setAuth(data: {
  token: string;
  role: Role;
  userId: string;
  userName: string;
  userEmail?: string;
}): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.token, data.token);
  localStorage.setItem(STORAGE_KEYS.role, data.role);
  localStorage.setItem(STORAGE_KEYS.userId, data.userId);
  localStorage.setItem(STORAGE_KEYS.userName, data.userName);
  if (data.userEmail != null) {
    localStorage.setItem(STORAGE_KEYS.userEmail, data.userEmail);
  }
}

/** Store only the access token (e.g. after refresh). Does not touch role/userId/etc. */
export function setToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.token, token);
}

export function clearAuth(): void {
  if (!isBrowser()) return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  if (process.env.NODE_ENV === "development") {
    console.debug("[auth] clearAuth: cleared localStorage and sessionStorage for auth keys");
  }
}

/** @deprecated Use setAuth */
export const setAuthSession = setAuth;

/** @deprecated Use clearAuth */
export const clearAuthSession = clearAuth;

/** Mock credentials for UI development when backend is unavailable */
export const MOCK_CREDENTIALS = [
  {
    email: "admin@test.com",
    password: "Admin123!",
    role: "ADMIN" as Role,
    userId: "admin-1",
    userName: "Admin User",
  },
  {
    email: "therapist@test.com",
    password: "Therapist123!",
    role: "THERAPIST" as Role,
    userId: "therapist-1",
    userName: "Jane Therapist",
  },
  {
    email: "client@test.com",
    password: "Client123!",
    role: "CLIENT" as Role,
    userId: "client-1",
    userName: "John Client",
  },
];
