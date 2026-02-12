"use client";

/**
 * AuthProvider: JWT-based auth state and /auth/me refresh.
 *
 * - /auth/me is only called when a JWT token exists; if no token we skip refreshMe.
 * - 401: clear token, set user=null, redirect to /login (via http.ts onUnauthorized).
 * - Backend down (ERR_CONNECTION_REFUSED): set backendStatus="down", do not loop requests.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getAuthUser,
  getToken,
  setAuth,
  clearAuth,
  type AuthUser,
  MOCK_CREDENTIALS,
} from "@/lib/auth";
import { setHttpUnauthorizedHandler, clearRefreshCookieOnServer, setAccessTokenHandlers } from "@/lib/http";
import { login as apiLogin, getMe, logout as apiLogout, refresh as apiRefresh } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export type BackendStatus = "unknown" | "up" | "down";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null; // In-memory access token (not localStorage)
  isLoading: boolean;
  isLoggedIn: boolean;
  backendStatus: BackendStatus;
};

const AuthContext = createContext<{
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  backendStatus: BackendStatus;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshMe: () => Promise<void>;
} | null>(null);

/** Only call in useEffect (client). Reads localStorage; do not use during render or SSR. */
function getStoredAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { user: null, accessToken: null, isLoading: true, isLoggedIn: false, backendStatus: "unknown" };
  }
  const storedUser = getAuthUser();
  const storedToken = getToken();
  const realToken =
    storedToken && typeof storedToken === "string" && storedToken.trim() !== "" && !storedToken.startsWith("mock-jwt-");
  if (storedUser && realToken) {
    return {
      user: storedUser,
      accessToken: storedToken!.trim(),
      isLoading: true,
      isLoggedIn: true,
      backendStatus: "unknown",
    };
  }
  return { user: null, accessToken: null, isLoading: false, isLoggedIn: false, backendStatus: "unknown" };
}

/** SSR-safe initial state: same on server and first client render to avoid hydration mismatch. */
const INITIAL_AUTH_STATE: AuthState = {
  user: null,
  accessToken: null,
  isLoading: true,
  isLoggedIn: false,
  backendStatus: "unknown",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [mounted, setMounted] = useState(false);
  const accessTokenRef = useRef<string | null>(state.accessToken);
  accessTokenRef.current = state.accessToken;

  // After mount: restore auth from localStorage so client-only APIs are used only on client.
  useEffect(() => {
    setMounted(true);
    setState(getStoredAuthState());
  }, []);

  // Expose access token getter/setter to http.ts. Ref ensures getter always sees latest token (avoids stale closure on mutations).
  useEffect(() => {
    setAccessTokenHandlers(
      () => accessTokenRef.current,
      (token: string) => {
        setState((s) => ({ ...s, accessToken: token }));
      }
    );
  }, []);

  const handleUnauthorized = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[auth] Session expired/401: clearing auth and redirecting (no logout API call)");
    }
    clearRefreshCookieOnServer();
    clearAuth();
    queryClient.clear();
    setState({ user: null, accessToken: null, isLoading: false, isLoggedIn: false, backendStatus: "unknown" });
    router.replace("/login");
  }, [router, queryClient]);

  useEffect(() => {
    setHttpUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  const refreshMe = useCallback(async () => {
    // Only call /auth/refresh when a real stored session exists (getAuthUser + real token).
    // If no stored session, set isLoading=false and do not refresh (avoids 401 and missing Authorization).
    const storedUser = getAuthUser();
    const storedToken = getToken();
    const realToken =
      storedToken && typeof storedToken === "string" && storedToken.trim() !== "" && !storedToken.startsWith("mock-jwt-");
    if (!storedUser || !realToken) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[AuthProvider] refreshMe: skipped (no stored session), not calling /auth/refresh");
      }
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[AuthProvider] refreshMe: attempting to refresh access token (stored session present)");
    }

    const refreshRes = await apiRefresh();
    if (refreshRes.ok && refreshRes.data?.token) {
      const newToken = refreshRes.data.token;
      // Store new access token in state (in-memory).
      setState((s) => ({ ...s, accessToken: newToken }));

      // Get user info with new token.
      const meRes = await getMe();
      if (meRes.ok && meRes.data) {
        const u = meRes.data;
        // Also store in localStorage for backward compatibility (but http.ts uses in-memory).
        setAuth({
          token: newToken,
          role: u.role,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
        });
        setState((s) => ({
          ...s,
          user: { userId: u.id, role: u.role, userName: u.name, userEmail: u.email },
          isLoading: false,
          isLoggedIn: true,
          backendStatus: "up",
        }));
        return;
      }
    }

    // Refresh failed: no valid refresh cookie or refresh token expired.
    if (process.env.NODE_ENV === "development") {
      console.debug("[AuthProvider] refreshMe: refresh failed, clearing auth");
    }
    clearAuth();
    setState({ user: null, accessToken: null, isLoading: false, isLoggedIn: false, backendStatus: "unknown" });
    router.replace("/login");
  }, [router]);

  // On app load: try to refresh only if we have a stored token (so we don't call /auth/refresh when user never logged in).
  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";
      const mock = useMockAuth
        ? MOCK_CREDENTIALS.find(
            (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
          )
        : null;
      if (mock) {
        const mockToken = "mock-jwt-" + mock.userId;
        setAuth({
          token: mockToken,
          role: mock.role,
          userId: mock.userId,
          userName: mock.userName,
          userEmail: mock.email,
        });
        setState((s) => ({
          ...s,
          user: { userId: mock.userId, role: mock.role, userName: mock.userName, userEmail: mock.email },
          accessToken: mockToken,
          isLoading: false,
          isLoggedIn: true,
          backendStatus: "up",
        }));
        router.replace("/dashboard");
        return { success: true };
      }
      const res = await apiLogin(email, password);
      if (res.ok && res.data) {
        const data = res.data as { token?: string; accessToken?: string; user: { id: string; role?: string; name?: string; email?: string } };
        const user = data.user;
        const token = (data.token ?? data.accessToken ?? "").trim();
        if (!token) {
          if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
            console.warn("[auth] Login response had no token/accessToken; not storing auth.");
          }
          return { success: false, error: "Server did not return a token." };
        }
        const role = (user.role || "client").toString().toUpperCase();
        const roleNorm = role === "ADMIN" || role === "THERAPIST" ? role : "CLIENT";
        
        // Store access token in state (in-memory) and localStorage (for backward compatibility).
        setAuth({
          token,
          role: roleNorm,
          userId: String(user.id),
          userName: user.name ?? "",
          userEmail: user.email ?? "",
        });
        setState({
          user: { userId: String(user.id), role: roleNorm, userName: user.name ?? "", userEmail: user.email ?? "" },
          accessToken: token, // Store in-memory for http.ts
          isLoading: false,
          isLoggedIn: true,
          backendStatus: "up",
        });
        
        if (process.env.NODE_ENV === "development") {
          console.debug("[auth] Login successful, access token stored in memory and localStorage");
        }
        
        router.replace("/dashboard");
        return { success: true };
      }
      const backendError = !res.ok && "error" in res ? res.error : "Invalid credentials";
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        // HttpResult<T> only has status when !ok, so guard access.
        const status = !res.ok && "status" in res ? res.status : "?";
        console.debug("[auth] login failed status:", status, "error:", backendError);
      }
      return {
        success: false,
        error: backendError,
      };
    },
    [router, refreshMe]
  );

  const handleLogout = useCallback(async () => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[auth] Logout: calling logout API then clearing auth and redirecting");
    }
    try {
      await apiLogout();
    } catch (_) {
      /* ignore */
    }
    clearAuth();
    queryClient.clear();
    setState({ user: null, accessToken: null, isLoading: false, isLoggedIn: false, backendStatus: "unknown" });
    router.replace("/login");
  }, [router, queryClient]);

  // Avoid hydration mismatch: server and first client render show same loading UI; no localStorage/window used until mounted.
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout: handleLogout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
