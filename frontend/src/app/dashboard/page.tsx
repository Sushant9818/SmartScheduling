"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthProvider";
import { useSessions, useAdminStats } from "@/hooks";
import { MOCK_SESSIONS_PER_WEEK, MOCK_STATUS_BREAKDOWN } from "@/lib/mockData";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Star,
  Clock,
  UserCog,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const COLORS = ["#18181b", "#71717a", "#22c55e", "#dc2626"];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: sessions = [], isLoading } = useSessions();
  const { overview, sessionsPerWeek, isLoading: adminLoading } = useAdminStats(
    8,
    !authLoading && user?.role === "ADMIN"
  );

  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const chartData =
    (sessionsPerWeek.data && sessionsPerWeek.data.length > 0)
      ? sessionsPerWeek.data
      : MOCK_SESSIONS_PER_WEEK;

  const upcoming = sessions.filter(
    (s) =>
      (s.status === "BOOKED" || s.status === "CONFIRMED") &&
      (today ? s.date >= today : true)
  );
  const completed = sessions.filter((s) => s.status === "COMPLETED");
  const cancelled = sessions.filter((s) => s.status === "CANCELLED");

  const adminCard = user?.role === "ADMIN" ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          System (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {adminLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : overview.data ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p>Users: {overview.data.totalUsers}</p>
            <p>Therapists: {overview.data.totalTherapists}</p>
            <p>Upcoming sessions: {overview.data.upcomingSessions}</p>
            <p>Cancel rate: {(overview.data.cancelRate * 100).toFixed(1)}%</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Total users and system stats – connect backend for live data.</p>
        )}
      </CardContent>
    </Card>
  ) : null;
  const therapistCard = user?.role === "THERAPIST" ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Next session
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length > 0 ? (
          <p className="text-sm">
            {upcoming[0].date} at {upcoming[0].time} with {upcoming[0].clientName}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
        )}
      </CardContent>
    </Card>
  ) : null;
  const clientCard = user?.role === "CLIENT" ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Next appointment
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length > 0 ? (
          <p className="text-sm">
            {upcoming[0].date} at {upcoming[0].time} with {upcoming[0].therapistName}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
        )}
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.userName ?? user?.userEmail}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Upcoming Sessions"
          value={upcoming.length}
          icon={Calendar}
          isLoading={isLoading}
        />
        <KpiCard
          title="Completed Sessions"
          value={completed.length}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
        <KpiCard
          title="Cancelled"
          value={cancelled.length}
          icon={XCircle}
          isLoading={isLoading}
        />
        <KpiCard
          title="Avg Rating"
          value="4.8"
          description="Mock"
          icon={Star}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sessions per week</CardTitle>
          </CardHeader>
          <CardContent>
            {adminLoading && user?.role === "ADMIN" ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="#18181b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={MOCK_STATUS_BREAKDOWN}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {MOCK_STATUS_BREAKDOWN.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {adminCard}
      {therapistCard}
      {clientCard}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
          <CardDescription>Next 5 sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 5).map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span>{s.date} {s.time}</span>
                  <span>{user?.role === "THERAPIST" ? s.clientName : s.therapistName}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
