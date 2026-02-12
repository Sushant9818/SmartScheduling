/**
 * Mock data fallback when API is unavailable or fails.
 */

import type { Role } from "./auth";

export interface MockSession {
  id: string;
  therapistId: string;
  therapistName: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  status: "BOOKED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  durationMinutes: number;
}

export interface MockTherapist {
  id: string;
  fullName: string;
  email: string;
  specialties: string[];
  rating: number;
  imageUrl?: string;
}

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface MockAvailability {
  id: string;
  therapistId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  recurring: boolean;
}

export const MOCK_SESSIONS: MockSession[] = [
  { id: "s1", therapistId: "therapist-1", therapistName: "Jane Therapist", clientId: "client-1", clientName: "John Client", date: "2025-02-10", time: "10:00", status: "BOOKED", durationMinutes: 60 },
  { id: "s2", therapistId: "therapist-1", therapistName: "Jane Therapist", clientId: "client-1", clientName: "John Client", date: "2025-02-05", time: "14:00", status: "COMPLETED", durationMinutes: 60 },
  { id: "s3", therapistId: "therapist-1", therapistName: "Jane Therapist", clientId: "client-2", clientName: "Alice Client", date: "2025-02-12", time: "09:00", status: "BOOKED", durationMinutes: 45 },
  { id: "s4", therapistId: "therapist-2", therapistName: "Bob Smith", clientId: "client-1", clientName: "John Client", date: "2025-02-08", time: "11:00", status: "CANCELLED", durationMinutes: 60 },
];

export const MOCK_THERAPISTS: MockTherapist[] = [
  { id: "therapist-1", fullName: "Jane Therapist", email: "therapist@test.com", specialties: ["Anxiety", "Depression"], rating: 4.8 },
  { id: "therapist-2", fullName: "Bob Smith", email: "bob@test.com", specialties: ["PTSD", "Trauma"], rating: 4.6 },
  { id: "therapist-3", fullName: "Carol White", email: "carol@test.com", specialties: ["Couples", "Family"], rating: 4.9 },
];

export const MOCK_USERS: MockUser[] = [
  { id: "admin-1", fullName: "Admin User", email: "admin@test.com", role: "ADMIN", status: "ACTIVE", createdAt: "2024-01-01" },
  { id: "therapist-1", fullName: "Jane Therapist", email: "therapist@test.com", role: "THERAPIST", status: "ACTIVE", createdAt: "2024-02-01" },
  { id: "client-1", fullName: "John Client", email: "client@test.com", role: "CLIENT", status: "ACTIVE", createdAt: "2024-03-01" },
  { id: "client-2", fullName: "Alice Client", email: "alice@test.com", role: "CLIENT", status: "ACTIVE", createdAt: "2024-03-15" },
];

export const MOCK_AVAILABILITY: MockAvailability[] = [
  { id: "av1", therapistId: "therapist-1", dayOfWeek: 1, startTime: "09:00", endTime: "12:00", recurring: true },
  { id: "av2", therapistId: "therapist-1", dayOfWeek: 3, startTime: "14:00", endTime: "17:00", recurring: true },
];

/** Sessions per week for charts (last 6 weeks) */
export const MOCK_SESSIONS_PER_WEEK = [
  { week: "W1", sessions: 12 },
  { week: "W2", sessions: 15 },
  { week: "W3", sessions: 10 },
  { week: "W4", sessions: 18 },
  { week: "W5", sessions: 14 },
  { week: "W6", sessions: 16 },
];

/** Admin overview fallback when /admin/stats/overview returns 404 */
export const MOCK_ADMIN_OVERVIEW = {
  totalUsers: 4,
  totalTherapists: 2,
  upcomingSessions: 3,
  cancelRate: 0.25,
};

/** Status breakdown for pie chart */
export const MOCK_STATUS_BREAKDOWN = [
  { name: "Booked", value: 25 },
  { name: "Completed", value: 40 },
  { name: "Cancelled", value: 5 },
];
