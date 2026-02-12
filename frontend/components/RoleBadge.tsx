import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  THERAPIST: "Therapist",
  CLIENT: "Client",
};

const roleVariants: Record<Role, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  THERAPIST: "secondary",
  CLIENT: "outline",
};

export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  return (
    <Badge
      variant={roleVariants[role]}
      className={cn("text-xs", className)}
      aria-label={`Role: ${roleLabels[role]}`}
    >
      {roleLabels[role]}
    </Badge>
  );
}
