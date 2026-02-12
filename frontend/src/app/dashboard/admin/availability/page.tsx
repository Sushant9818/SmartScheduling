"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAvailability,
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
} from "@/hooks";
import { useAdminTherapists } from "@/hooks";
import type { MockAvailability } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_API = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export default function AdminAvailabilityPage() {
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MockAvailability | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [recurring, setRecurring] = useState(true);

  const { data: therapists = [], isLoading: therapistsLoading } = useAdminTherapists();
  const { data: slots = [], isLoading: slotsLoading } = useAvailability(
    selectedTherapistId ? { therapistId: selectedTherapistId } : undefined
  );
  const createMutation = useCreateAvailability(selectedTherapistId || undefined);
  const updateMutation = useUpdateAvailability(selectedTherapistId || undefined);
  const deleteMutation = useDeleteAvailability(selectedTherapistId || undefined);

  function resetForm() {
    setDayOfWeek(1);
    setStartTime("09:00");
    setEndTime("12:00");
    setRecurring(true);
    setEditing(null);
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  function handleSubmit() {
    if (!selectedTherapistId) return;
    if (editing) {
      updateMutation.mutate(
        {
          slotId: editing.id,
          payload: {
            dayOfWeek: DAYS_API[editing.dayOfWeek] ?? "MONDAY",
            startTime,
            endTime,
            recurringWeekly: recurring,
          },
        },
        { onSuccess: () => { setDialogOpen(false); setEditing(null); resetForm(); } }
      );
    } else {
      createMutation.mutate(
        {
          dayOfWeek: DAYS_API[dayOfWeek] ?? "MONDAY",
          startTime,
          endTime,
          recurring,
        },
        { onSuccess: () => { setDialogOpen(false); resetForm(); } }
      );
    }
  }

  const openEdit = (slot: MockAvailability) => {
    setEditing(slot);
    setDayOfWeek(slot.dayOfWeek);
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    setRecurring(slot.recurring);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Manage Therapist Availability</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select therapist</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTherapistId}
            onValueChange={(v) => { setSelectedTherapistId(v); setEditing(null); setDialogOpen(false); }}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Choose a therapist" />
            </SelectTrigger>
            <SelectContent>
              {therapistsLoading ? (
                <SelectItem value="_loading" disabled>Loading…</SelectItem>
              ) : (
                therapists
                  .filter((t) => t.id != null && String(t.id).trim() !== "")
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName} ({t.email})
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTherapistId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Availability slots</CardTitle>
            <Button
              onClick={() => { setEditing(null); setDialogOpen(true); resetForm(); }}
              disabled={slotsLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add slot
            </Button>
          </CardHeader>
          <CardContent>
            {slotsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : slots.length === 0 ? (
              <p className="text-muted-foreground">No slots. Add one above.</p>
            ) : (
              <ul className="space-y-2">
                {slots.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span>
                      {DAYS[slot.dayOfWeek]} {slot.startTime} – {slot.endTime}
                      {slot.recurring && " (recurring)"}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(slot)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(slot.id)}
                        aria-label="Delete"
                        className="text-destructive"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditing(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit slot" : "Add availability"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select
                value={String(editing?.dayOfWeek ?? dayOfWeek)}
                onValueChange={(v) => setDayOfWeek(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={editing?.recurring ?? recurring}
                onChange={(e) => setRecurring(e.target.checked)}
              />
              <Label htmlFor="recurring">Recurring weekly</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? (updateMutation.isPending ? "Saving…" : "Update") : (createMutation.isPending ? "Adding…" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
