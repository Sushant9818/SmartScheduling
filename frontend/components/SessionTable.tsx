"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";
import type { MockSession } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const statusVariant: Record<string, "default" | "secondary" | "success" | "destructive" | "outline"> = {
  BOOKED: "default",
  CONFIRMED: "secondary",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export interface SessionTableProps {
  sessions: MockSession[];
  role: Role;
  onReschedule?: (session: MockSession) => void;
  onCancel?: (session: MockSession) => void;
  onConfirm?: (session: MockSession) => void;
  onMarkCompleted?: (session: MockSession) => void;
}

export function SessionTable({
  sessions,
  role,
  onReschedule,
  onCancel,
  onConfirm,
  onMarkCompleted,
}: SessionTableProps) {
  const canAct = (s: MockSession) =>
    s.status === "BOOKED" || s.status === "CONFIRMED";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>{role === "THERAPIST" ? "Client" : role === "CLIENT" ? "Therapist" : "Therapist / Client"}</TableHead>
          <TableHead>Status</TableHead>
          {(role === "CLIENT" || role === "THERAPIST" || role === "ADMIN") && (
            <TableHead className="text-right">Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No sessions found.
            </TableCell>
          </TableRow>
        ) : (
          sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.date}</TableCell>
              <TableCell>{s.time}</TableCell>
              <TableCell>
                {role === "THERAPIST" ? s.clientName : role === "ADMIN" ? `${s.therapistName} / ${s.clientName}` : s.therapistName}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[s.status] ?? "outline"} className="capitalize">
                  {s.status.toLowerCase()}
                </Badge>
              </TableCell>
              {(role === "CLIENT" || role === "THERAPIST" || role === "ADMIN") && (
                <TableCell className="text-right">
                  {canAct(s) && (
                    <div className="flex justify-end gap-1">
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
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
