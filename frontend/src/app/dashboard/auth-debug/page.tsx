"use client";

/**
 * Auth Debug page – verify token flow and refresh cookie.
 * Use after login to: see accessToken, call /auth/debug-cookies, /auth/refresh, /sessions.
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { getDebugCookies, refresh, getSessions } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/config";

export default function AuthDebugPage() {
  const { user, accessToken: tokenFromState } = useAuth();
  const [debugCookiesResult, setDebugCookiesResult] = useState<string>("");
  const [refreshResult, setRefreshResult] = useState<string>("");
  const [sessionsResult, setSessionsResult] = useState<string>("");
  const [tokenPreview, setTokenPreview] = useState<string>("(none)");

  useEffect(() => {
    const fromStorage = getToken();
    const token = tokenFromState ?? fromStorage;
    setTokenPreview(token ? token.substring(0, 30) + "..." : "(none)");
  }, [tokenFromState]);

  const handleDebugCookies = async () => {
    setDebugCookiesResult("Loading...");
    const res = await getDebugCookies();
    setDebugCookiesResult(
      res.ok && res.data
        ? JSON.stringify(
            {
              cookieNames: Object.keys(res.data.cookies || {}),
              hasRefreshToken: "refreshToken" in (res.data.cookies || {}),
            },
            null,
            2
          )
        : `Error: ${res.error ?? res.status}`
    );
  };

  const handleRefresh = async () => {
    setRefreshResult("Loading...");
    const res = await refresh();
    setRefreshResult(
      res.ok && res.data?.token
        ? `OK – new token (first 20 chars): ${res.data.token.substring(0, 20)}...`
        : `Error: ${res.error ?? res.status}`
    );
  };

  const handleSessions = async () => {
    setSessionsResult("Loading...");
    const res = await getSessions();
    setSessionsResult(
      res.ok && Array.isArray(res.data)
        ? `OK – ${res.data.length} session(s)`
        : `Error: ${res.error ?? res.status}`
    );
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Auth Debug</h1>
      <Card>
        <CardHeader>
          <CardTitle>State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>API_BASE_URL:</strong> {API_BASE_URL}
          </p>
          <p>
            <strong>User:</strong> {user ? `${user.userName} (${user.role})` : "(none)"}
          </p>
          <p>
            <strong>Access token (preview):</strong> {tokenPreview}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Test calls (credentials: include)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button onClick={handleDebugCookies} variant="secondary" size="sm" className="mr-2">
              GET /auth/debug-cookies
            </Button>
            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{debugCookiesResult || "—"}</pre>
          </div>
          <div>
            <Button onClick={handleRefresh} variant="secondary" size="sm" className="mr-2">
              POST /auth/refresh
            </Button>
            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{refreshResult || "—"}</pre>
          </div>
          <div>
            <Button onClick={handleSessions} variant="secondary" size="sm" className="mr-2">
              GET /sessions
            </Button>
            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{sessionsResult || "—"}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
