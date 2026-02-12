"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SessionTable } from "@/components/SessionTable";
import { SessionCardList } from "@/components/SessionCardList";
import { useAuth } from "@/context/AuthProvider";
import { useSessions, useUpdateSessionStatus } from "@/hooks";
import type { MockSession } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function MySchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<MockSession | null>(null);

  const { data: sessions = [], isLoading } = useSessions();
  const updateStatus = useUpdateSessionStatus();

  const filtered = useMemo(() => {
    let list = sessions;
    if (statusFilter && statusFilter !== "ALL") list = list.filter((s) => s.status === statusFilter);
    if (dateFrom) list = list.filter((s) => s.date >= dateFrom);
    if (dateTo) list = list.filter((s) => s.date <= dateTo);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.clientName?.toLowerCase().includes(q) ||
          s.therapistName?.toLowerCase().includes(q) ||
          s.date?.includes(q)
      );
    }
    return list;
  }, [sessions, statusFilter, dateFrom, dateTo, search]);

  const handleCancel = (s: MockSession) => {
    updateStatus.mutate({ id: s.id, status: "CANCELLED" });
    setCancelTarget(null);
  };

  const handleMarkCompleted = (s: MockSession) => {
    updateStatus.mutate({ id: s.id, status: "COMPLETED" });
  };

  const openReschedule = (s: MockSession) => {
    router.push(`/book?mode=reschedule&sessionId=${s.id}`);
  };

  const title = user?.role === "CLIENT" ? "My Bookings" : user?.role === "THERAPIST" ? "My Sessions" : "Schedules";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        {user?.role === "CLIENT" && (
          <Button asChild>
            <Link href="/dashboard/therapists">
              <Plus className="h-4 w-4 mr-2" />
              Book New Session
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={statusFilter || "ALL"} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="BOOKED">Booked</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
            />
            <Input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
            />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No sessions match your filters.</p>
          ) : (
            <>
              <div className="hidden md:block">
                <SessionTable
                  sessions={filtered}
                  role={user!.role}
                  onReschedule={openReschedule}
                  onCancel={(s) => setCancelTarget(s)}
                  onMarkCompleted={handleMarkCompleted}
                />
              </div>
              <SessionCardList
                sessions={filtered}
                role={user!.role}
                onReschedule={openReschedule}
                onCancel={(s) => setCancelTarget(s)}
                onMarkCompleted={handleMarkCompleted}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel session?</DialogTitle>
          </DialogHeader>
          {cancelTarget && (
            <p className="text-sm">
              Cancel session on {cancelTarget.date} at {cancelTarget.time}?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>No</Button>
            <Button
              variant="destructive"
              onClick={() => cancelTarget && handleCancel(cancelTarget)}
              disabled={updateStatus.isPending}
            >
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
