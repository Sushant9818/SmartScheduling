export type SessionStatus =
  | "BOOKED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export interface Session {
  id: string;
  therapistId: string;
  therapistName?: string;
  clientId: string;
  clientName?: string;
  startAt: string;
  endAt: string;
  status: SessionStatus;
  notes?: string;
}

export interface CreateSessionRequest {
  therapistId: string;
  startAt: string;
  endAt: string;
  notes?: string;
}

/** Backend contract for PATCH /api/sessions/:id/reschedule. Use buildSessionTimesUTC(date, time, durationMinutes) to build from UI. */
export interface RescheduleRequest {
  startAt: string;
  endAt: string;
}

export interface UpdateStatusRequest {
  status: SessionStatus;
}

export interface GetSessionsParams {
  status?: SessionStatus;
  from?: string;
  to?: string;
  q?: string;
  therapistId?: string;
  clientId?: string;
}
