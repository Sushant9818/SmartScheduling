/**
 * HTTP client – single source of truth for all API requests.
 *
 * - Access token: stored in-memory (AuthProvider state), attached as Authorization: Bearer <token>.
 * - Refresh token: httpOnly cookie (set by backend on login/refresh).
 * - 401 with code TOKEN_EXPIRED: auto-refresh using cookie, retry original request once.
 * - All requests use credentials: "include" so the browser sends the refreshToken cookie to API_BASE_URL (e.g. http://localhost:5001/api).
 * - API_BASE_URL must be exactly http://localhost:5001/api (no 5002 or 127.0.0.1) so cookie domain matches.
 *
 * Verification: (1) Login → check Set-Cookie in response. (2) DevTools → Application → Cookies → localhost:5001 → refreshToken.
 * (3) POST /api/auth/refresh → Request Headers include Cookie. (4) Expire access token → protected route → refresh+retry succeeds.
 */

import { API_BASE_URL } from "./config";
import { clearAuth } from "./auth";

export type HttpResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

let onUnauthorized: (() => void) | null = null;
let accessTokenGetter: (() => string | null) | null = null;
let accessTokenSetter: ((token: string) => void) | null = null;

export function setHttpUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

/**
 * Set access token getter/setter from AuthProvider (in-memory storage).
 * Token is stored in React state, not localStorage.
 */
export function setAccessTokenHandlers(
  getter: () => string | null,
  setter: (token: string) => void
) {
  accessTokenGetter = getter;
  accessTokenSetter = setter;
}

/**
 * Read access token from in-memory storage (AuthProvider state).
 * Returns token even if expired so backend can return 401 TOKEN_EXPIRED and we can try refresh.
 */
function getAccessTokenForRequest(): string | null {
  if (typeof window === "undefined") return null;
  if (!accessTokenGetter) return null;
  const token = accessTokenGetter();
  if (!token || token.trim() === "" || token.startsWith("mock-jwt-")) return null;
  return token.trim();
}


/** Extract a single readable error message from common backend shapes (400/409 validation, etc.) */
function extractErrorMessage(
  json: Record<string, unknown>,
  fallback: string
): string {
  if (typeof json.message === "string") return json.message;
  if (typeof json.error === "string") return json.error;
  const errors = json.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof (first as { message?: string }).message === "string") {
      return (first as { message: string }).message;
    }
  }
  return fallback;
}

async function parseResponse<T>(res: Response): Promise<{
  data?: T;
  error?: string;
  rawText?: string;
  json?: Record<string, unknown>;
}> {
  const text = await res.text();
  let data: T | undefined;
  let error: string | undefined;
  let json: Record<string, unknown> = {};
  try {
    json = (text ? JSON.parse(text) : {}) as Record<string, unknown>;
    if (res.ok) data = json as T;
    else error = extractErrorMessage(json, res.statusText || "Request failed");
  } catch {
    error = res.statusText || "Invalid response";
  }
  return { data, error, json };
}

/**
 * Join base URL + path so we never get double /api or missing slashes.
 * - base: from config (e.g. "http://localhost:8080/api"), no trailing slash.
 * - path: e.g. "/auth/me", "/health", "/sessions" (leading slash, no /api in path).
 * - Result: "http://localhost:8080/api/auth/me" (never /api/api/...).
 */
function buildUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const segment = path.startsWith("/") ? path : `/${path}`;
  return `${base}${segment}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isRetryAfterRefresh = false
): Promise<HttpResult<T>> {
  const url = buildUrl(path);
  const token = getAccessTokenForRequest();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (process.env.NODE_ENV === "development") {
    const preview = token ? token.substring(0, 10) + (token.length > 10 ? "…" : "") : "(none)";
    console.debug("[http] request", method, path, "hasAuthHeader:", !!headers["Authorization"], "tokenPreview:", preview);
  }

  // All requests use credentials: "include" to send httpOnly refresh cookie when needed.
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const { data, error, json } = await parseResponse<T>(res);

    if (res.status === 401) {
      const isLoginRequest = path.startsWith("/auth/login");
      const isRefreshRequest = path.startsWith("/auth/refresh");
      const isLogoutRequest = path.startsWith("/auth/logout");

      if (isLoginRequest) {
        return { ok: false, error: error ?? "Unauthorized", status: 401 };
      }

      // Only try refresh when backend returns TOKEN_EXPIRED (not NO_TOKEN or INVALID_TOKEN).
      const errorCode = typeof json?.code === "string" ? json.code : undefined;
      const isTokenExpired = errorCode === "TOKEN_EXPIRED";

      // Only try refresh for TOKEN_EXPIRED; never for login, refresh, or logout (prevents infinite loops).
      const mayTryRefresh =
        isTokenExpired &&
        !isRetryAfterRefresh &&
        !isRefreshRequest &&
        !isLogoutRequest &&
        typeof window !== "undefined";

      if (mayTryRefresh) {
        const refreshUrl = buildUrl("/auth/refresh");
        try {
          if (process.env.NODE_ENV === "development") {
            console.debug("[http] 401 TOKEN_EXPIRED: attempting refresh");
          }
          const refreshRes = await fetch(refreshUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
          const refreshParsed = await parseResponse<{ token?: string }>(refreshRes);
          if (refreshRes.ok && refreshParsed.data?.token) {
            // Update access token in AuthProvider state (in-memory).
            if (accessTokenSetter) {
              accessTokenSetter(refreshParsed.data.token);
            }
            if (process.env.NODE_ENV === "development") {
              console.debug("[http] token refreshed, retrying original request");
            }
            return request<T>(method, path, body, true);
          } else {
            if (process.env.NODE_ENV === "development") {
              const refreshCode = typeof refreshParsed.json?.code === "string" ? refreshParsed.json.code : undefined;
              console.debug("[http] refresh failed:", refreshCode || refreshParsed.error || "unknown error");
            }
          }
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.debug("[http] refresh request failed:", err);
          }
        }
      }

      // Refresh failed or not attempted: clear locally and notify; do not call logout API here (handler does redirect only).
      if (typeof window !== "undefined") {
        if (process.env.NODE_ENV === "development") {
          console.debug("[http] 401: clearing auth and calling onUnauthorized (redirect to login)");
        }
        clearAuth();
        onUnauthorized?.();
      }
      return {
        ok: false,
        error: error ?? "Unauthorized",
        status: 401,
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        error: error ?? "Forbidden",
        status: 403,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: error ?? res.statusText ?? "Request failed",
        status: res.status,
      };
    }

    return { ok: true, data: data as T };
  } catch (e) {
    // ERR_CONNECTION_REFUSED or other network errors: fail safely, never throw. Do not retry.
    const connectionError = "Backend offline";
    if (typeof window !== "undefined" && path !== "/health") {
      try {
        const { toast } = await import("sonner");
        toast.error(connectionError);
      } catch (_) {
        /* sonner not available */
      }
    }
    return {
      ok: false,
      error: connectionError,
      status: 0,
    };
  }
}

export async function get<T>(path: string): Promise<HttpResult<T>> {
  return request<T>("GET", path);
}

export async function post<T>(path: string, body: unknown): Promise<HttpResult<T>> {
  return request<T>("POST", path, body);
}

export async function patch<T>(path: string, body: unknown): Promise<HttpResult<T>> {
  return request<T>("PATCH", path, body);
}

export async function del<T>(path: string): Promise<HttpResult<T>> {
  return request<T>("DELETE", path);
}

/**
 * Clear refresh cookie on server (no Authorization required). Call on session expiry before redirecting to login.
 * Fire-and-forget; does not throw.
 */
export function clearRefreshCookieOnServer(): void {
  if (typeof window === "undefined") return;
  const url = buildUrl("/auth/logout");
  fetch(url, { method: "POST", credentials: "include" }).catch(() => {});
}
