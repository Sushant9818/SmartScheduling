"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { useTherapists, useCreateSession, useAvailability } from "@/hooks";
import { buildSessionTimes } from "@/lib/api";
import type { MockTherapist } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star } from "lucide-react";

const SLOT_DURATION_MIN = 30;

/** Stable keys for loading skeletons (do not use array index as key). */
const THERAPIST_SKELETON_KEYS = ["therapist-skeleton-1", "therapist-skeleton-2", "therapist-skeleton-3"];

/** Build 30-min time options (HH:mm) from availability slots for a given day (0=Sun..6=Sat). */
function timeOptionsForDay(availability: { dayOfWeek: number; startTime: string; endTime: string }[], dayOfWeek: number): string[] {
  const slots = availability.filter((a) => a.dayOfWeek === dayOfWeek);
  const set = new Set<string>();
  for (const s of slots) {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    let min = sh * 60 + sm;
    const endMin = eh * 60 + em;
    while (min + SLOT_DURATION_MIN <= endMin) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      set.add(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      min += SLOT_DURATION_MIN;
    }
  }
  return Array.from(set).sort();
}

export default function TherapistsPage() {
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("ALL");
  const [bookingTherapist, setBookingTherapist] = useState<MockTherapist | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("09:00");
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 10));
  }, []);

  const { data: therapists = [], isLoading } = useTherapists();
  const { data: availability = [], isLoading: availabilityLoading } = useAvailability(
    bookingTherapist ? { therapistId: bookingTherapist.id } : undefined
  );
  const createSessionMutation = useCreateSession();

  const specialties = useMemo(() => {
    const set = new Set<string>();
    therapists.forEach((t) =>
      t.specialties?.forEach((s) => {
        if (s != null && String(s).trim() !== "") set.add(String(s).trim());
      })
    );
    return Array.from(set);
  }, [therapists]);

  const filtered = useMemo(() => {
    let list = therapists;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.fullName?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q)
      );
    }
    if (specialtyFilter && specialtyFilter !== "ALL") {
      list = list.filter((t) => t.specialties?.includes(specialtyFilter));
    }
    return list;
  }, [therapists, search, specialtyFilter]);

  const bookDayOfWeek = bookDate ? new Date(bookDate + "T12:00:00").getDay() : null;
  const availableTimes = useMemo(() => {
    if (bookDayOfWeek == null || !availability.length) return [];
    return timeOptionsForDay(availability, bookDayOfWeek);
  }, [availability, bookDayOfWeek]);

  useEffect(() => {
    if (bookDate && availableTimes.length && !availableTimes.includes(bookTime)) {
      setBookTime(availableTimes[0] ?? "09:00");
    }
  }, [bookDate, availableTimes, bookTime]);

  function handleConfirmBooking() {
    if (!bookingTherapist || !bookDate) return;
    const { startAt, endAt } = buildSessionTimes(bookDate, bookTime, SLOT_DURATION_MIN);
    createSessionMutation.mutate(
      {
        therapistId: bookingTherapist.id,
        startAt,
        endAt,
      },
      { onSuccess: () => setBookingTherapist(null) }
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Therapist Directory</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={specialtyFilter || "ALL"} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THERAPIST_SKELETON_KEYS.map((skeletonKey) => (
            <Skeleton key={skeletonKey} className="h-48 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No therapists found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-3xl text-muted-foreground mb-2">
                    {t.fullName?.charAt(0) ?? "?"}
                  </div>
                  <h3 className="font-semibold">{t.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{t.email}</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {t.specialties?.map((s) => (
                      <Badge key={`${t.id}-${s}`} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-sm flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {t.rating?.toFixed(1) ?? "–"}
                  </p>
                </div>
                <Button className="w-full" onClick={() => setBookingTherapist(t)}>
                  Book
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!bookingTherapist} onOpenChange={() => setBookingTherapist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book session</DialogTitle>
          </DialogHeader>
          {bookingTherapist && (
            <p className="text-sm text-muted-foreground">
              Book with {bookingTherapist.fullName}. Pick a date and an available slot.
            </p>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                min={minDate}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              {availabilityLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={availableTimes.length ? (availableTimes.includes(bookTime) ? bookTime : availableTimes[0]) : undefined}
                  onValueChange={setBookTime}
                  disabled={!bookDate || availableTimes.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!bookDate ? "Pick a date first" : "No slots this day"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {bookDate && !availabilityLoading && availableTimes.length === 0 && (
                <p className="text-xs text-muted-foreground">No availability for this day. Pick another date.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingTherapist(null)}>Cancel</Button>
            <Button
              onClick={handleConfirmBooking}
              disabled={!bookDate || !availableTimes.length || createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? "Booking…" : "Confirm booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
