import type { Role } from "./auth";

export const ROLES: Role[] = ["ADMIN", "THERAPIST", "CLIENT"];

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
}

export const DASHBOARD_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ["ADMIN", "THERAPIST", "CLIENT"] },
  { href: "/dashboard/my-schedule", label: "My Schedule", icon: "Calendar", roles: ["ADMIN", "THERAPIST", "CLIENT"] },
  { href: "/dashboard/availability", label: "Availability", icon: "Clock", roles: ["THERAPIST"] },
  { href: "/book", label: "Book Session", icon: "CalendarPlus", roles: ["CLIENT"] },
  { href: "/dashboard/therapists", label: "Therapists", icon: "Users", roles: ["CLIENT"] },
  { href: "/dashboard/admin/users", label: "Users", icon: "UserCog", roles: ["ADMIN"] },
  { href: "/dashboard/admin/sessions", label: "Sessions", icon: "CalendarCheck", roles: ["ADMIN"] },
  { href: "/dashboard/admin/availability", label: "Availability", icon: "Clock", roles: ["ADMIN"] },
  { href: "/dashboard/settings", label: "Settings", icon: "Settings", roles: ["ADMIN", "THERAPIST", "CLIENT"] },
  { href: "/dashboard/auth-debug", label: "Auth Debug", icon: "Bug", roles: ["ADMIN", "THERAPIST", "CLIENT"] },
];

export function canAccessRoute(pathname: string, role: Role): boolean {
  if (pathname.startsWith("/dashboard/admin")) return role === "ADMIN";
  if (pathname === "/dashboard/availability") return role === "THERAPIST";
  if (pathname === "/book") return true;
  if (pathname === "/dashboard/therapists") return role === "CLIENT";
  if (pathname === "/dashboard/auth-debug") return true;
  return true;
}
