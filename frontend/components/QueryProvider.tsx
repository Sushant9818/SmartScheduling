"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/** Detect network/connection errors so we do not retry (avoids infinite loops when backend is down). */
function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("Backend offline") ||
    message.includes("Backend is not running") ||
    message.includes("wrong port") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("Load failed")
  );
}

/**
 * React Query provider.
 * - No retries on network errors (ERR_CONNECTION_REFUSED, etc.) to prevent request loops.
 * - Retry up to 2 times only for transient server errors (e.g. 5xx, timeouts).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error) => {
              if (isNetworkError(error)) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
