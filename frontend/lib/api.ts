/**
 * API layer – single source of truth for backend calls.
 * Uses lib/http.ts (buildUrl) and lib/config.ts (API_BASE_URL).
 * Paths are relative and must NOT include /api (e.g. /auth/me, /health, /sessions).
 * Backend contract: Spring Boot REST API; no changes to API contracts here.
 */

import { get, post, patch, del } from "./http";
import { getUserId, getRole } from "./auth";
import { formatInstantToLocal, buildSessionTimesUTC } from "./datetime";
import type { LoginResponse, User, RegisterPayload, RegisterResponse } from "@/types/auth";
import type {
  Session,
  CreateSessionRequest,
  RescheduleRequest,
  GetSessionsParams,
} from "@/types/session";
import type {
  Availability,
  CreateAvailabilityPayload,
  GetAvailabilityParams,
} from "@/types/availability";
import type {
  UserDto,
  GetUsersParams,
  CreateUserPayload,
  UpdateUserPayload,
} from "@/types/user";
import type { Therapist, GetTherapistsParams } from "@/types/therapist";
import type { AdminOverviewStats, SessionsPerWeekPoint } from "@/types/stats";
import {
  MOCK_SESSIONS,
  MOCK_THERAPISTS,
  MOCK_USERS,
  MOCK_AVAILABILITY,
  type MockSession,
  type MockTherapist,
  type MockUser,
  type MockAvailability,
} from "./mockData";

// --- Health (no auth) ---

export interface HealthResponse {
  status: string;
}

export async function getHealth() {
  return get<HealthResponse>("/health");
}

// --- Public (no auth) ---

export interface AvailableSlotItem {
  therapistId: string;
  therapistName: string;
  slots: string[];
}

/** GET /api/public/available-slots?date=YYYY-MM-DD&durationMinutes=30 – computed free slots per therapist. */
export async function getAvailableSlots(
  date: string,
  durationMinutes = 30
): Promise<AvailableSlotItem[]> {
  const params = new URLSearchParams({ date, durationMinutes: String(durationMinutes) });
  const res = await get<AvailableSlotItem[]>(`/public/available-slots?${params.toString()}`);
  if (res.ok && Array.isArray(res.data)) return res.data;
  return [];
}

// --- Auth ---

/** Login: backend expects { email, password }. Returns { token, accessToken?, user } on success. Token must be saved to localStorage ("accessToken") by the caller. */
export async function login(email: string, password: string) {
  const body = { email: email?.trim?.() ?? "", password: password ?? "" };
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug("[api] login request payload keys:", Object.keys(body));
  }
  const res = await post<LoginResponse>("/auth/login", body);
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    const status = res.ok ? 200 : "status" in res ? res.status : "?";
    const errMsg = !res.ok && "error" in res ? res.error : "";
    const hasToken = res.ok && res.data && ("token" in res.data || "accessToken" in res.data);
    console.debug("[api] login response status:", status, res.ok ? "ok" : "error:", errMsg, "hasToken:", hasToken);
  }
  return res;
}

/**
 * Register a new user. Sends role as lowercase (client/therapist) for backend compatibility.
 * Path: /auth/register (API_BASE_URL already includes /api).
 */
export async function register(payload: RegisterPayload) {
  const body = {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    role: payload.role.toLowerCase(),
  };
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug("[Register] payload (role normalized):", { ...body, password: "[REDACTED]" });
  }
  const res = await post<RegisterResponse>("/auth/register", body);
  if (!res.ok) {
    console.error("[Register] failed:", res.status, res.error);
  }
  return res;
}

/** GET /api/auth/me – current user from JWT. Requires Authorization: Bearer <token>. */
export async function getMe() {
  return get<User>("/auth/me");
}

/** POST /api/auth/refresh – refresh access token using httpOnly refresh cookie. Returns { token } on success. */
export async function refresh() {
  return post<{ token: string }>("/auth/refresh", {});
}

/** POST /api/auth/logout – clears refresh cookie on server. Backend does not require Authorization; cookie is sent with credentials. */
export async function logout() {
  return post<{ message?: string }>("/auth/logout", {});
}

/** GET /api/auth/debug-cookies – returns cookies received by backend (for auth debugging). Use credentials so cookie is sent. */
export async function getDebugCookies() {
  return get<{ cookieHeader: string | null; cookies: Record<string, string> }>("/auth/debug-cookies");
}

/** POST /api/password/change – change password for logged-in user. Requires Authorization: Bearer <token>. Body: { currentPassword, newPassword }. */
export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  return post<{ message: string }>("/password/change", payload);
}

// --- Sessions ---

/** Backend session shape (Node/Express: start/end, populated therapist/client) */
interface BackendSession {
  _id?: string;
  id?: string;
  therapist?: { _id?: string; name?: string } | string;
  client?: { _id?: string; name?: string; email?: string } | string;
  start?: string;
  end?: string;
  startAt?: string;
  endAt?: string;
  status?: string;
}

function backendSessionToSession(b: BackendSession): Session {
  const id = b.id ?? b._id ?? "";
  const startAt = b.startAt ?? b.start ?? "";
  const endAt = b.endAt ?? b.end ?? "";
  const therapistId = typeof b.therapist === "object" ? b.therapist?._id ?? "" : (b.therapist ?? "");
  const therapistName = typeof b.therapist === "object" ? b.therapist?.name ?? "" : "";
  const clientId = typeof b.client === "object" ? b.client?._id ?? "" : (b.client ?? "");
  const clientName = typeof b.client === "object" ? b.client?.name ?? "" : "";
  const statusMap: Record<string, Session["status"]> = {
    scheduled: "BOOKED",
    booked: "BOOKED",
    confirmed: "CONFIRMED",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };
  const rawStatusKey = b.status ? String(b.status).toLowerCase() : "";
  const status: Session["status"] = statusMap[rawStatusKey] ?? "BOOKED";
  return {
    id: String(id),
    therapistId: String(therapistId),
    therapistName,
    clientId: String(clientId),
    clientName,
    startAt,
    endAt,
    status,
  };
}

/** Normalize API Session (UTC instants) to UI shape (local date/time) */
export function normalizeSession(s: Session): MockSession {
  const { date, time } = formatInstantToLocal(s.startAt);
  const start = new Date(s.startAt);
  const durationMinutes = Math.round(
    (new Date(s.endAt).getTime() - start.getTime()) / 60000
  );
  return {
    id: s.id,
    therapistId: s.therapistId,
    therapistName: s.therapistName ?? "",
    clientId: s.clientId,
    clientName: s.clientName ?? "",
    date,
    time,
    status: s.status,
    durationMinutes,
  };
}

export async function getSessions(
  params?: GetSessionsParams
): Promise<MockSession[]> {
  const qs = params
    ? "?" + new URLSearchParams(params as Record<string, string>).toString()
    : "";
  const res = await get<BackendSession[]>(`/sessions${qs}`);
  if (res.ok && Array.isArray(res.data)) {
    return res.data.map((b) => normalizeSession(backendSessionToSession(b)));
  }
  return [];
}

/** Mongo ObjectId: 24 hex characters. Use this to ensure we only send real backend IDs, not mock ids like "therapist-1". */
export function isValidTherapistId(id: unknown): id is string {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id.trim());
}

/**
 * POST /api/sessions – client only.
 * Backend contract: therapistId (string, Mongo ObjectId 24 hex), startAt (ISO 8601), endAt (ISO 8601), notes? (optional).
 * clientId is from JWT; do not send clientId in body.
 */
export async function createSession(payload: CreateSessionRequest) {
  const therapistId =
    typeof payload.therapistId === "string" ? payload.therapistId.trim() : String(payload.therapistId ?? "").trim();
  const startAt = typeof payload.startAt === "string" ? payload.startAt.trim() : "";
  const endAt = typeof payload.endAt === "string" ? payload.endAt.trim() : "";

  if (!isValidTherapistId(therapistId)) {
    const msg =
      therapistId === ""
        ? "therapistId is required"
        : "therapistId must be a valid therapist ID. Use Book a session or refresh the therapist list.";
    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
      console.debug("[api] createSession validation:", msg);
    }
    return { ok: false as const, error: msg, status: 400 };
  }
  if (!startAt) {
    return { ok: false as const, error: "startAt is required", status: 400 };
  }
  if (!endAt) {
    return { ok: false as const, error: "endAt is required", status: 400 };
  }

  const body: Record<string, string> = {
    therapistId,
    startAt,
    endAt,
  };
  if (payload.notes != null && payload.notes !== "") {
    body.notes = typeof payload.notes === "string" ? payload.notes : String(payload.notes);
  }

  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug("[api] createSession request body:", JSON.stringify(body, null, 2));
  }
  const res = await post<BackendSession>("/sessions", body);
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development" && !res.ok) {
    const err = res as { ok: false; error?: string; status?: number };
    console.debug("[api] createSession error:", err.status, err.error);
  }
  return res;
}

export function buildSessionTimes(
  date: string,
  time: string,
  durationMinutes: number = 30
): { startAt: string; endAt: string } {
  return buildSessionTimesUTC(date, time, durationMinutes);
}

export async function bookSession(params: {
  therapistId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  notes?: string;
}) {
  const { startAt, endAt } = buildSessionTimes(
    params.date,
    params.time,
    params.durationMinutes ?? 30
  );
  const res = await createSession({
    therapistId: params.therapistId,
    startAt,
    endAt,
    notes: params.notes,
  });
  if (res.ok && res.data) {
    return { ok: true, data: backendSessionToSession(res.data as BackendSession) };
  }
  return { ok: false, error: (res as { ok: false; error?: string }).error, status: (res as { status?: number }).status };
}

export async function getSession(id: string) {
  return get<Session>(`/sessions/${id}`);
}

/** GET /sessions/:id and return normalized MockSession for display (date, time, durationMinutes, therapistId, etc.). Returns null on error. */
export async function getSessionNormalized(id: string): Promise<MockSession | null> {
  const res = await get<BackendSession>(`/sessions/${id}`);
  if (!res.ok || !res.data) return null;
  return normalizeSession(backendSessionToSession(res.data));
}

/** PATCH /api/sessions/:id/reschedule. Payload: { startAt: ISO string, endAt: ISO string }. Use buildSessionTimesUTC(date, time, duration) to build. */
export async function rescheduleSession(id: string, payload: RescheduleRequest) {
  return patch<Session>(`/sessions/${id}/reschedule`, {
    startAt: payload.startAt,
    endAt: payload.endAt,
  });
}

// --- Reschedule pre-check ---

export type RescheduleCheckReason =
  | "NOT_IN_AVAILABILITY"
  | "CONFLICT"
  | "PAST"
  | "INVALID_TIME"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATUS"
  | "SERVER_ERROR";

export interface RescheduleCheckData {
  canReschedule: boolean;
  reason?: RescheduleCheckReason;
  message?: string;
}

export type RescheduleCheckResult =
  | ({ ok: true } & RescheduleCheckData)
  | { ok: false; error: string; status?: number };

/** POST /api/sessions/:id/reschedule-check – lightweight pre-check before rescheduling. */
export async function checkRescheduleSession(
  id: string,
  payload: RescheduleRequest
): Promise<RescheduleCheckResult> {
  const body = {
    startAt: payload.startAt,
    endAt: payload.endAt,
  };
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug("[api] checkRescheduleSession request body:", JSON.stringify(body, null, 2));
  }
  const res = await post<RescheduleCheckData>(`/sessions/${id}/reschedule-check`, body);
  if (res.ok && res.data) {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
      console.debug("[api] checkRescheduleSession response:", JSON.stringify(res.data, null, 2));
    }
    return { ok: true, ...res.data };
  }
  const err = res as { ok: false; error?: string; status?: number };
  return {
    ok: false,
    error: err.error ?? "Failed to check reschedule",
    status: err.status,
  };
}

/** Alias for checkRescheduleSession. */
export const rescheduleCheck = checkRescheduleSession;

/** Backend expects status: "scheduled" | "cancelled" | "completed". */
export async function updateSessionStatus(id: string, status: string) {
  const backendStatus =
    status === "CANCELLED" ? "cancelled" : status === "COMPLETED" ? "completed" : "scheduled";
  return patch<Session>(`/sessions/${id}/status`, { status: backendStatus });
}

export async function cancelSession(id: string) {
  return updateSessionStatus(id, "CANCELLED");
}

// --- Therapists ---

function toTherapist(t: Therapist & { _id?: string }): MockTherapist {
  const id = t.id ?? (t._id != null ? String(t._id) : "");
  return {
    id,
    fullName: t.fullName ?? t.name ?? t.email,
    email: t.email,
    specialties: t.specialties ?? [],
    rating: t.rating ?? 0,
    imageUrl: t.imageUrl,
  };
}

export async function getTherapists(
  params?: GetTherapistsParams
): Promise<MockTherapist[]> {
  const qs = params
    ? "?" + new URLSearchParams(params as Record<string, string>).toString()
    : "";
  const res = await get<Therapist[] | { content?: Therapist[] }>(`/therapists${qs}`);
  if (res.ok) {
    const data = res.data;
    const list = Array.isArray(data) ? data : data?.content ?? [];
    return list.map(toTherapist);
  }
  return [...MOCK_THERAPISTS];
}

export async function getTherapist(id: string) {
  return get<Therapist>(`/therapists/${id}`);
}

// --- Availability ---

const DAY_NUM_TO_STR: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

/**
 * GET /api/availability
 * - Therapist: call without params (backend uses token → own availability).
 * - Admin: call with { therapistId: selectedTherapistId }.
 */
export async function getAvailability(
  params?: GetAvailabilityParams
): Promise<MockAvailability[]> {
  const qs =
    params?.therapistId != null && params.therapistId !== ""
      ? `?therapistId=${encodeURIComponent(params.therapistId)}`
      : "";
  const res = await get<Availability[]>(`/availability${qs}`);
  const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  if (res.ok && Array.isArray(res.data)) {
    return res.data.map((a) => {
      const dayNum =
        typeof a.dayOfWeek === "string"
          ? Math.max(0, DAYS.indexOf(a.dayOfWeek))
          : (a.dayOfWeek ?? 1);
      return {
        id: a.id ?? String((a as { _id?: string })._id),
        therapistId: (a as { therapistId?: string }).therapistId ?? "",
        dayOfWeek: dayNum,
        startTime: a.startTime,
        endTime: a.endTime,
        recurring: a.recurringWeekly ?? true,
      };
    });
  }
  return [];
}

/**
 * POST /api/availability
 * - Therapist: call without therapistId (backend uses token).
 * - Admin: must include therapistId.
 */
export async function createAvailability(payload: {
  therapistId?: string;
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
  recurring?: boolean;
}) {
  const dayOfWeek: number | string =
    typeof payload.dayOfWeek === "number" && payload.dayOfWeek >= 0 && payload.dayOfWeek <= 6
      ? DAY_NUM_TO_STR[payload.dayOfWeek] ?? "MONDAY"
      : typeof payload.dayOfWeek === "string"
        ? payload.dayOfWeek
        : DAY_NUM_TO_STR[payload.dayOfWeek as number] ?? "MONDAY";
  const body: Record<string, unknown> = {
    dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    recurringWeekly: payload.recurring ?? true,
  };
  if (payload.therapistId != null && payload.therapistId !== "") {
    body.therapistId = payload.therapistId;
  }
  const res = await post<Availability>("/availability", body);
  if (!res.ok) throw new Error(res.error ?? "Failed to add availability");
  return res.data!;
}

/**
 * PATCH /api/availability/:id
 * Payload: { dayOfWeek?, startTime?, endTime?, recurringWeekly? } (dayOfWeek as 0-6 or "MONDAY" etc)
 */
export async function updateAvailability(
  slotId: string,
  payload: { dayOfWeek?: number | string; startTime?: string; endTime?: string; recurringWeekly?: boolean }
) {
  const body: Record<string, unknown> = {};
  if (payload.dayOfWeek !== undefined) {
    body.dayOfWeek =
      typeof payload.dayOfWeek === "number"
        ? DAY_NUM_TO_STR[payload.dayOfWeek] ?? "MONDAY"
        : payload.dayOfWeek;
  }
  if (payload.startTime !== undefined) body.startTime = payload.startTime;
  if (payload.endTime !== undefined) body.endTime = payload.endTime;
  if (payload.recurringWeekly !== undefined) body.recurringWeekly = payload.recurringWeekly;
  return patch<Availability>(`/availability/${slotId}`, body);
}

export async function deleteAvailability(slotId: string) {
  return del<unknown>(`/availability/${slotId}`);
}

// --- Admin: Users ---

function toUserDto(u: UserDto): MockUser {
  return {
    id: u.id,
    fullName: u.fullName ?? u.name ?? "",
    email: u.email,
    role: u.role,
    status: u.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    createdAt: (u as { createdAt?: string }).createdAt ?? "",
  };
}

export async function getUsers(params?: GetUsersParams): Promise<MockUser[]> {
  const qs = params
    ? "?" + new URLSearchParams(params as Record<string, string>).toString()
    : "";
  const res = await get<UserDto[] | { content?: UserDto[] }>(`/users${qs}`);
  if (res.ok) {
    const data = res.data;
    const list = Array.isArray(data) ? data : data?.content ?? [];
    return list.map(toUserDto);
  }
  return [...MOCK_USERS];
}

export async function createUser(payload: CreateUserPayload) {
  return post<UserDto>("/users", payload);
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  return patch<UserDto>(`/users/${id}`, payload);
}

export async function enableUser(id: string) {
  return post<unknown>(`/users/${id}/enable`, {});
}

export async function disableUser(id: string) {
  return post<unknown>(`/users/${id}/disable`, {});
}

// --- Admin: Stats ---

export async function getAdminOverviewStats() {
  return get<AdminOverviewStats>("/admin/stats/overview");
}

export async function getSessionsPerWeek(weeks: number = 8) {
  return get<SessionsPerWeekPoint[]>(
    `/admin/stats/sessions-per-week?weeks=${weeks}`
  );
}

// --- Admin: Users (GET/POST/PATCH/DELETE /admin/users) ---

export type AdminUsersParams = { role?: string; q?: string };

export async function adminGetUsers(params?: AdminUsersParams): Promise<MockUser[]> {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => v != null && String(v).trim() !== "")
        ) as Record<string, string>
      )
    : "";
  const res = await get<Array<{ id: string; name: string; email: string; role: string; createdAt?: string }>>(
    `/admin/users${qs}`
  );
  if (res.ok && Array.isArray(res.data)) {
    return res.data.map((u) => ({
      id: u.id,
      fullName: u.name,
      email: u.email,
      role: (u.role || "").toUpperCase() as MockUser["role"],
      status: "ACTIVE" as const,
      createdAt: u.createdAt ?? "",
    }));
  }
  return [];
}

/** Legacy alias. */
export async function getAdminUsers(params?: AdminUsersParams): Promise<MockUser[]> {
  return adminGetUsers(params);
}

export async function adminCreateUser(payload: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "therapist" | "client";
}) {
  return post<{ id: string; name: string; email: string; role: string; createdAt?: string }>(
    "/admin/users",
    { ...payload, role: payload.role.toLowerCase() }
  );
}

export async function adminUpdateUser(
  id: string,
  payload: { name?: string; email?: string; role?: "admin" | "therapist" | "client" }
) {
  const body = payload.role ? { ...payload, role: payload.role.toLowerCase() } : payload;
  return patch<{ id: string; name: string; email: string; role: string; createdAt?: string }>(
    `/admin/users/${id}`,
    body
  );
}

export async function adminDeleteUser(id: string, deleteProfile = true) {
  const qs = deleteProfile ? "?deleteProfile=true" : "?deleteProfile=false";
  return del<{ message: string }>(`/admin/users/${id}${qs}`);
}

// --- Admin: Therapists (GET/POST/PATCH/DELETE /admin/therapists) ---

export async function getAdminTherapists(): Promise<MockTherapist[]> {
  const res = await get<Therapist[]>(`/admin/therapists`);
  if (res.ok && Array.isArray(res.data)) {
    return res.data.map(toTherapist);
  }
  return [...MOCK_THERAPISTS];
}

export async function createAdminTherapist(payload: {
  name: string;
  email: string;
  password: string;
  specialties?: string[];
}) {
  return post<Therapist>("/admin/therapists", payload);
}

export async function updateAdminTherapist(id: string, payload: { name?: string; email?: string; specialties?: string[] }) {
  return patch<Therapist>(`/admin/therapists/${id}`, payload);
}

export async function deleteAdminTherapist(id: string, query?: { deleteUser?: boolean; cancelSessions?: boolean }) {
  const qs = query ? "?" + new URLSearchParams(query as Record<string, string>).toString() : "";
  return del<{ message: string }>(`/admin/therapists/${id}${qs}`);
}

// --- Admin: Clients (GET/POST/PATCH/DELETE /admin/clients) ---

interface BackendClient {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  preferences?: Record<string, unknown>;
}

export async function getAdminClients(): Promise<Array<{ id: string; fullName: string; email: string }>> {
  const res = await get<BackendClient[]>(`/admin/clients`);
  if (res.ok && Array.isArray(res.data)) {
    return res.data.map((c) => ({
      id: String(c._id ?? c.id ?? ""),
      fullName: c.name,
      email: c.email ?? "",
    }));
  }
  return [];
}

export async function createAdminClient(payload: { name: string; email?: string }) {
  return post<BackendClient>("/admin/clients", payload);
}

export async function updateAdminClient(id: string, payload: { name?: string; email?: string; preferences?: unknown }) {
  return patch<BackendClient>(`/admin/clients/${id}`, payload);
}

export async function deleteAdminClient(id: string, query?: { deleteUser?: boolean; cancelSessions?: boolean }) {
  const qs = query ? "?" + new URLSearchParams(query as Record<string, string>).toString() : "";
  return del<{ message: string }>(`/admin/clients/${id}${qs}`);
}

// --- Admin: Sessions (GET/POST/PATCH/DELETE /admin/sessions) ---

/** Admin create session: backend expects therapistId, clientId, start, end (ISO or Date). */
export async function createAdminSession(payload: {
  therapistId: string;
  clientId: string;
  start: string;
  end: string;
}) {
  const res = await post<BackendSession>("/admin/sessions", payload);
  if (res.ok && res.data) {
    return { ok: true as const, data: backendSessionToSession(res.data) };
  }
  const err = res as { ok: false; error?: string; status?: number };
  return { ok: false as const, error: err.error ?? "Failed to create session", status: err.status };
}

export async function getAdminSessions(params?: GetSessionsParams): Promise<MockSession[]> {
  const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
  const res = await get<BackendSession[]>(`/admin/sessions${qs}`);
  if (res.ok && Array.isArray(res.data)) {
    return res.data.map((b) => normalizeSession(backendSessionToSession(b)));
  }
  return [];
}

export async function rescheduleAdminSession(id: string, payload: RescheduleRequest) {
  return patch<Session>(`/admin/sessions/${id}/reschedule`, payload);
}

export async function updateAdminSessionStatus(id: string, status: string) {
  const backendStatus = status === "CANCELLED" ? "cancelled" : status === "COMPLETED" ? "completed" : "scheduled";
  return patch<Session>(`/admin/sessions/${id}/status`, { status: backendStatus });
}

export async function deleteAdminSession(id: string) {
  return del<unknown>(`/admin/sessions/${id}`);
}

// --- Admin: Availability (GET/POST/PATCH/DELETE /admin/availability) ---

const DAYS_ARR = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function mapAvailabilityResponse(data: Availability[], defaultTherapistId = ""): MockAvailability[] {
  return data.map((a) => {
    const dayNum = typeof a.dayOfWeek === "string" ? Math.max(0, DAYS_ARR.indexOf(a.dayOfWeek)) : (a.dayOfWeek ?? 1);
    return {
      id: (a as { id?: string }).id ?? String((a as { _id?: string })._id),
      therapistId: (a as { therapistId?: string }).therapistId ?? defaultTherapistId,
      dayOfWeek: dayNum,
      startTime: a.startTime,
      endTime: a.endTime,
      recurring: (a as { recurringWeekly?: boolean }).recurringWeekly ?? true,
    };
  });
}

/** GET /admin/availability (list all) or GET /admin/availability?therapistId=X (one therapist). */
export async function getAdminAvailability(therapistId?: string): Promise<MockAvailability[]> {
  const qs = therapistId != null && therapistId !== "" ? `?therapistId=${encodeURIComponent(therapistId)}` : "";
  const res = await get<Availability[]>(`/admin/availability${qs}`);
  if (res.ok && Array.isArray(res.data)) {
    return mapAvailabilityResponse(res.data, therapistId ?? "");
  }
  return [];
}

export async function createAdminAvailability(payload: {
  therapistId: string;
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
  recurring?: boolean;
}) {
  const dayOfWeek =
    typeof payload.dayOfWeek === "number"
      ? DAY_NUM_TO_STR[payload.dayOfWeek] ?? "MONDAY"
      : payload.dayOfWeek;
  const body: Record<string, unknown> = {
    therapistId: payload.therapistId,
    dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    recurringWeekly: payload.recurring ?? true,
  };
  return post<Availability>("/admin/availability", body);
}

export async function updateAdminAvailability(
  slotId: string,
  payload: { dayOfWeek?: number | string; startTime?: string; endTime?: string; recurringWeekly?: boolean }
) {
  const body: Record<string, unknown> = {};
  if (payload.dayOfWeek !== undefined) {
    body.dayOfWeek =
      typeof payload.dayOfWeek === "number" ? DAY_NUM_TO_STR[payload.dayOfWeek] ?? "MONDAY" : payload.dayOfWeek;
  }
  if (payload.startTime !== undefined) body.startTime = payload.startTime;
  if (payload.endTime !== undefined) body.endTime = payload.endTime;
  if (payload.recurringWeekly !== undefined) body.recurringWeekly = payload.recurringWeekly;
  return patch<Availability>(`/admin/availability/${slotId}`, body);
}

export async function deleteAdminAvailability(slotId: string) {
  return del<unknown>(`/admin/availability/${slotId}`);
}
