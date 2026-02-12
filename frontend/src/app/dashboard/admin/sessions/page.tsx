"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSessions, useUpdateSessionStatus } from "@/hooks";
import type { MockSession } from "@/lib/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

const statusVariant: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  BOOKED: "default",
  CONFIRMED: "secondary",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export default function AdminSessionsPage() {
  const [therapistFilter, setTherapistFilter] = useState<string>("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: sessions = [], isLoading } = useSessions();
  const updateStatus = useUpdateSessionStatus();

  const therapists = useMemo(() => {
    const set = new Map<string, string>();
    sessions.forEach((s) => {
      const id = s.therapistId != null ? String(s.therapistId).trim() : "";
      if (id) set.set(id, s.therapistName ?? "—");
    });
    return Array.from(set.entries());
  }, [sessions]);

  const clients = useMemo(() => {
    const set = new Map<string, string>();
    sessions.forEach((s) => {
      const id = s.clientId != null ? String(s.clientId).trim() : "";
      if (id) set.set(id, s.clientName ?? "—");
    });
    return Array.from(set.entries());
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = sessions;
    if (therapistFilter && therapistFilter !== "ALL") list = list.filter((s) => s.therapistId === therapistFilter);
    if (clientFilter && clientFilter !== "ALL") list = list.filter((s) => s.clientId === clientFilter);
    if (statusFilter && statusFilter !== "ALL") list = list.filter((s) => s.status === statusFilter);
    if (dateFrom) list = list.filter((s) => s.date >= dateFrom);
    if (dateTo) list = list.filter((s) => s.date <= dateTo);
    return list;
  }, [sessions, therapistFilter, clientFilter, statusFilter, dateFrom, dateTo]);

  function handleUpdateStatus(sessionId: string, status: string) {
    updateStatus.mutate({ id: sessionId, status });
  }

  function handleCancel(s: MockSession) {
    if (!confirm("Cancel this session?")) return;
    updateStatus.mutate({ id: s.id, status: "CANCELLED" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Manage Sessions</h1>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={therapistFilter || "ALL"} onValueChange={setTherapistFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Therapist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {therapists.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter || "ALL"} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {clients.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || "ALL"} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
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
            <input
              type="date"
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <input
              type="date"
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-4">No sessions match the filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Therapist</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.time}</TableCell>
                    <TableCell>{s.therapistName}</TableCell>
                    <TableCell>{s.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[s.status] ?? "secondary"} className="capitalize">
                        {s.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(s.status === "BOOKED" || s.status === "CONFIRMED") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-1"
                            onClick={() => handleUpdateStatus(s.id, "COMPLETED")}
                            disabled={updateStatus.isPending}
                          >
                            Complete
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleCancel(s)} disabled={updateStatus.isPending}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
