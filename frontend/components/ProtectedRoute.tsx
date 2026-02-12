"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { canAccessRoute } from "@/lib/roles";
import type { Role } from "@/lib/auth";

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: Role;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname ?? "/dashboard"));
      return;
    }
    if (pathname && !canAccessRoute(pathname, user.role)) {
      router.replace("/access-denied");
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return null;
  if (pathname && !canAccessRoute(pathname, user.role)) {
    return null;
  }
  return <>{children}</>;
}
