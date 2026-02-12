"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getAvailableSlots,
  createSession,
  getSessionNormalized,
  checkRescheduleSession,
  rescheduleSession,
} from "@/lib/api";
import { buildSessionTimesAsUTC } from "@/lib/datetime";
import type { AvailableSlotItem } from "@/lib/api";
import type { MockSession } from "@/lib/mockData";
import { SESSIONS_KEY } from "@/hooks/useSessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

const DURATION_MINUTES = 30;

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function BookSessionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "book";
  const sessionId = searchParams.get("sessionId");

  const [date, setDate] = useState(todayISO);
  const [pendingReschedule, setPendingReschedule] = useState<{
    sessionId: string;
    oldLabel: string;
    newLabel: string;
    startAt: string;
    endAt: string;
  } | null>(null);

  const isReschedule = mode === "reschedule" && !!sessionId;

  const { data: existingSession, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const session = await getSessionNormalized(sessionId);
      if (!session) throw new Error("Failed to load session");
      return session;
    },
    enabled: isReschedule,
  });

  const duration = isReschedule && existingSession ? existingSession.durationMinutes : DURATION_MINUTES;

  const { data: therapistsWithSlotsRaw = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["availableSlots", date, duration],
    queryFn: () => getAvailableSlots(date, duration),
  });

  const therapistsWithSlots = useMemo(() => {
    if (!isReschedule || !existingSession) return therapistsWithSlotsRaw;
    return therapistsWithSlotsRaw.filter((item) => item.therapistId === existingSession.therapistId);
  }, [isReschedule, existingSession, therapistsWithSlotsRaw]);

  const isLoading = mode === "book" ? slotsLoading : sessionLoading || slotsLoading;

  const bookMutation = useMutation({
    mutationFn: async ({
      therapistId,
      startAt,
      endAt,
      notes,
    }: {
      therapistId: string;
      startAt: string;
      endAt: string;
      notes?: string;
    }) => {
      const payload = { therapistId, startAt, endAt, notes };
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
        console.debug("[BookSession] outgoing booking body:", JSON.stringify(payload, null, 2));
      }
      const res = await createSession(payload);
      if (!res.ok) {
        const err = res as { error?: string; status?: number };
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
          console.debug("[BookSession] backend error response:", err.status, err.error);
        }
        const msg = err.error ?? "Failed to book";
        if (err.status === 409) throw new Error("Slot already booked, pick another");
        throw new Error(msg);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["availableSlots", date] });
      toast.success("Session booked");
      router.push("/dashboard/my-schedule");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Booking failed");
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, startAt, endAt }: { id: string; startAt: string; endAt: string }) => {
      const res = await rescheduleSession(id, { startAt, endAt });
      if (!res.ok) throw new Error((res as { error?: string }).error ?? "Failed to reschedule");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["availableSlots", date, duration] });
      toast.success("Session rescheduled");
      setPendingReschedule(null);
      router.replace("/dashboard/my-schedule");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Reschedule failed");
    },
  });

  const handleSlotClick = async (item: AvailableSlotItem, time: string) => {
    const { startAt, endAt } = buildSessionTimesAsUTC(date, time, duration);

    if (isReschedule && sessionId && existingSession) {
      const check = await checkRescheduleSession(sessionId, { startAt, endAt });
      if (!check.ok) {
        toast.error(check.error ?? "Could not verify reschedule");
        return;
      }
      if (!check.canReschedule) {
        const reason = check.reason;
        let msg = check.message ?? "Cannot reschedule to that time.";
        if (reason === "NOT_IN_AVAILABILITY") msg = "That time is outside the therapist's availability.";
        else if (reason === "CONFLICT") msg = "That time conflicts with another session.";
        else if (reason === "PAST") msg = "You cannot reschedule to a time in the past.";
        toast.error(msg);
        return;
      }
      setPendingReschedule({
        sessionId,
        oldLabel: `${existingSession.date} ${existingSession.time}`,
        newLabel: `${date} ${time}`,
        startAt,
        endAt,
      });
      return;
    }

    bookMutation.mutate({ therapistId: item.therapistId, startAt, endAt });
  };

  const isPending = bookMutation.isPending || rescheduleMutation.isPending;

  return (
    <div className="container max-w-2xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {isReschedule ? "Reschedule session" : "Book a session"}
      </h1>
      {isReschedule && existingSession && (
        <p className="text-muted-foreground">
          Rescheduling from <strong>{existingSession.date} at {existingSession.time}</strong>. Pick a new date and time below.
        </p>
      )}
      {!isReschedule && (
        <p className="text-muted-foreground">
          Pick a date, then choose an available time with a therapist.
        </p>
      )}
      {isReschedule && sessionError && (
        <p className="text-destructive">
          {(sessionError as Error).message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="book-date">Session date</Label>
          <Input
            id="book-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={todayISO()}
            className="max-w-xs mt-1"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {isReschedule ? "Available slots" : "Available therapists & slots"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : therapistsWithSlots.length === 0 ? (
            <p className="text-muted-foreground">
              No available slots for this date. Try another day.
            </p>
          ) : (
            <ul className="space-y-6">
              {therapistsWithSlots.map((item) => (
                <li key={item.therapistId}>
                  <h3 className="font-semibold mb-2">{item.therapistName}</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.slots.map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSlotClick(item, time)}
                        disabled={isPending}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={!!pendingReschedule}
        title="Confirm reschedule"
        description={
          pendingReschedule
            ? `Reschedule from ${pendingReschedule.oldLabel} to ${pendingReschedule.newLabel}?`
            : ""
        }
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        confirmDisabled={rescheduleMutation.isPending}
        onCancel={() => setPendingReschedule(null)}
        onConfirm={() => {
          if (!pendingReschedule) return;
          rescheduleMutation.mutate({
            id: pendingReschedule.sessionId,
            startAt: pendingReschedule.startAt,
            endAt: pendingReschedule.endAt,
          });
        }}
      />
    </div>
  );
}
