"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  Clock,
  Users,
  UserCog,
  CalendarCheck,
  Settings,
  Bug,
  type LucideIcon,
} from "lucide-react";
import { DASHBOARD_NAV, type NavItem } from "@/lib/roles";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  Clock,
  Users,
  UserCog,
  CalendarCheck,
  Settings,
  Bug,
};

export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = DASHBOARD_NAV.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1 px-2" aria-label="Dashboard navigation">
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
