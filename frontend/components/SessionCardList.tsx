"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";
import type { MockSession } from "@/lib/mockData";

const statusVariant: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  BOOKED: "default",
  CONFIRMED: "secondary",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export interface SessionCardListProps {
  sessions: MockSession[];
  role: Role;
  onReschedule?: (session: MockSession) => void;
  onCancel?: (session: MockSession) => void;
  onMarkCompleted?: (session: MockSession) => void;
}

export function SessionCardList({
  sessions,
  role,
  onReschedule,
  onCancel,
  onMarkCompleted,
}: SessionCardListProps) {
  const canAct = (s: MockSession) =>
    s.status === "BOOKED" || s.status === "CONFIRMED";

  if (sessions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No sessions found.</p>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {sessions.map((s) => (
        <Card key={s.id}>
          <CardContent className="pt-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-medium">
                  {role === "THERAPIST" ? s.clientName : role === "ADMIN" ? `${s.therapistName} · ${s.clientName}` : s.therapistName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {s.date} at {s.time}
                </p>
                <Badge variant={statusVariant[s.status] ?? "secondary"} className="mt-2 capitalize">
                  {s.status.toLowerCase()}
                </Badge>
              </div>
              {canAct(s) && (
                <div className="flex flex-col gap-1">
                  {role === "CLIENT" && onReschedule && (
                    <Button variant="outline" size="sm" onClick={() => onReschedule(s)}>
                      Reschedule
                    </Button>
                  )}
                  {(role === "THERAPIST" || role === "ADMIN") && onMarkCompleted && (
                    <Button variant="outline" size="sm" onClick={() => onMarkCompleted(s)}>
                      Complete
                    </Button>
                  )}
                  {onCancel && (
                    <Button variant="destructive" size="sm" onClick={() => onCancel(s)}>
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
