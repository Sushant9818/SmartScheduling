import mongoose from "mongoose";
import Session from "../models/Session.js";
import Client from "../models/Client.js";
import Therapist from "../models/Therapist.js";
import Availability from "../models/Availability.js";

// OPTIONAL: comment these if you haven't created them yet
import { audit } from "../utils/audit.js";
import { sendEmail } from "../utils/mailer.js";

const DAYS_ENUM = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function toDate(value) {
  if (value == null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Mongo ObjectId is 24 hex characters. */
function isValidObjectIdString(str) {
  return typeof str === "string" && /^[a-fA-F0-9]{24}$/.test(str.trim());
}

// overlap rule: existing.start < end AND existing.end > start
function overlapQuery(start, end) {
  return { start: { $lt: end }, end: { $gt: start } };
}

function safeMsg(err, fallback = "Request failed") {
  return err?.response?.data?.message || err?.message || fallback;
}

async function safeAudit(req, payload) {
  try {
    if (typeof audit === "function") await audit(req, payload);
  } catch {
    // never block API
  }
}

async function safeSendEmail({ to, subject, text }) {
  try {
    if (!to) return;
    if (typeof sendEmail === "function") await sendEmail({ to, subject, text });
  } catch {
    // never crash API if email fails
  }
}

function safeEmit(req, event, payload) {
  try {
    const io = req.app?.get("io");
    io?.emit(event, payload);
  } catch {
    // ignore
  }
}

/**
 * Resolve actor ids: prefer req.user.clientId / req.user.therapistId set by requireAuth.
 */
async function resolveActorIds(req) {
  if (req._actorIds) return req._actorIds;

  const user = req.user;
  if (!user) {
    req._actorIds = { role: null, userId: null, clientId: null, therapistId: null };
    return req._actorIds;
  }

  const role = user.role;
  const userId = user.sub ? String(user.sub) : null;
  let clientId = user.clientId ?? null;
  let therapistId = user.therapistId ?? null;

  if (!clientId && role === "client") {
    try {
      const email = user.email ? String(user.email).toLowerCase() : null;
      const c = (userId && (await Client.findOne({ user: userId }).select("_id").lean())) ||
        (email && (await Client.findOne({ email }).select("_id").lean()));
      clientId = c?._id ? String(c._id) : null;
    } catch {
      clientId = null;
    }
  }
  if (!therapistId && role === "therapist") {
    try {
      const email = user.email ? String(user.email).toLowerCase() : null;
      const t = (userId && (await Therapist.findOne({ user: userId }).select("_id").lean())) ||
        (email && (await Therapist.findOne({ email }).select("_id").lean()));
      therapistId = t?._id ? String(t._id) : null;
    } catch {
      therapistId = null;
    }
  }

  req._actorIds = { role, userId, clientId, therapistId };
  return req._actorIds;
}

/** Get day of week string from a Date (0=Sunday -> SUNDAY, etc.). */
function dateToDayOfWeek(d) {
  const day = d.getDay();
  return DAYS_ENUM[day] ?? "MONDAY";
}

/** Get day of week in UTC (for availability check so it matches public/available-slots). */
function dateToDayOfWeekUTC(d) {
  const day = d.getUTCDay();
  return DAYS_ENUM[day] ?? "MONDAY";
}

/** Get "HH:mm" from a Date. */
function dateToHHmm(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Get "HH:mm" in UTC (for availability check so it matches public/available-slots). */
function dateToHHmmUTC(d) {
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Check if (start, end) falls within any availability slot for therapist on that weekday. Uses UTC to match public available-slots. */
async function isWithinAvailability(therapistId, start, end) {
  const dayOfWeek = dateToDayOfWeekUTC(start);
  const startStr = dateToHHmmUTC(start);
  const endStr = dateToHHmmUTC(end);
  const slots = await Availability.find({ therapist: therapistId, dayOfWeek }).lean();
  if (slots.length === 0) return false;
  const startMin = parseInt(startStr.slice(0, 2), 10) * 60 + parseInt(startStr.slice(3), 10);
  const endMin = parseInt(endStr.slice(0, 2), 10) * 60 + parseInt(endStr.slice(3), 10);
  for (const s of slots) {
    const sMin = parseInt(s.startTime.slice(0, 2), 10) * 60 + parseInt(s.startTime.slice(3), 10);
    const eMin = parseInt(s.endTime.slice(0, 2), 10) * 60 + parseInt(s.endTime.slice(3), 10);
    if (startMin >= sMin && endMin <= eMin) return true;
  }
  return false;
}

/**
 * Authorization helper (strict + safe)
 * - admin: always allowed
 * - client: only own session
 * - therapist: only own session
 * - if mapping can't be resolved: deny (fail closed)
 */
function canAccessSessionStrict(actorIds, sessionDoc) {
  if (!actorIds?.role) return false;

  if (actorIds.role === "admin") return true;

  if (actorIds.role === "client") {
    if (!actorIds.clientId) return false;
    return String(sessionDoc.client?._id || sessionDoc.client) === String(actorIds.clientId);
  }

  if (actorIds.role === "therapist") {
    if (!actorIds.therapistId) return false;
    return String(sessionDoc.therapist?._id || sessionDoc.therapist) === String(actorIds.therapistId);
  }

  return false;
}

/**
 * GET /api/sessions
 * - admin: all sessions
 * - client: only sessions where client == req.user.clientId
 * - therapist: only sessions where therapist == req.user.therapistId
 * Populate therapist/client names for UI.
 */
export async function listSessions(req, res) {
  try {
    const user = req.user;
    const filter = {};

    if (req.query.status) filter.status = req.query.status;

    if (user?.role === "client") {
      const clientId = user.clientId ?? (await resolveActorIds(req)).clientId;
      if (!clientId) return res.json([]);
      filter.client = clientId;
    } else if (user?.role === "therapist") {
      const therapistId = user.therapistId ?? (await resolveActorIds(req)).therapistId;
      if (!therapistId) return res.json([]);
      filter.therapist = therapistId;
    }
    // admin: no extra filter → all

    const sessions = await Session.find(filter)
      .sort({ start: -1 })
      .populate("therapist", "name")
      .populate("client", "name email");

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: safeMsg(err, "Failed to load sessions") });
  }
}

/**
 * GET /api/sessions/:id
 * Returns one session if found and user is allowed (client: own, therapist: own, admin: any). 403 if forbidden, 404 if not found.
 */
export async function getSession(req, res) {
  try {
    const existing = await Session.findById(req.params.id)
      .populate("therapist", "name")
      .populate("client", "name email");

    if (!existing) return res.status(404).json({ message: "Session not found" });

    const actorIds = await resolveActorIds(req);
    if (!canAccessSessionStrict(actorIds, existing)) {
      return res.status(403).json({ message: "You do not have access to this session" });
    }

    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: safeMsg(err, "Failed to load session") });
  }
}

/**
 * POST /api/sessions (client only)
 *
 * Required body fields:
 *   - therapistId: string (Mongo ObjectId, 24 hex chars)
 *   - startAt: string (ISO 8601 date, e.g. "2026-02-09T09:00:00.000Z")
 *   - endAt: string (ISO 8601 date, must be after startAt)
 * Optional: notes (string)
 * clientId: taken from JWT (req.user.clientId); body clientId is ignored.
 *
 * Validation: therapist exists, client exists, startAt/endAt valid and ordered,
 * requested window within therapist availability (UTC weekday), no conflict.
 */
function safeUserForLog(user) {
  if (!user) return null;
  return {
    id: user.id,
    sub: user.sub,
    role: user.role,
    clientId: user.clientId ?? undefined,
    therapistId: user.therapistId ?? undefined,
  };
}

export async function bookSession(req, res) {
  const validationFailure = (message) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions] book 400 validation:", message);
      console.debug("[sessions] book req.body:", JSON.stringify(req.body));
      console.debug("[sessions] book req.user:", JSON.stringify(safeUserForLog(req.user)));
    }
    return res.status(400).json({ message });
  };

  try {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions] book req.body:", JSON.stringify(req.body));
      console.debug("[sessions] book req.user:", JSON.stringify(safeUserForLog(req.user)));
    }

    const clientId = req.user.clientId ?? (await resolveActorIds(req)).clientId;
    if (!clientId) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] book 403: no clientId for user", safeUserForLog(req.user));
      }
      return res.status(403).json({ message: "Not authorized to book as a client" });
    }

    const { therapistId, startAt, endAt, notes } = req.body;

    if (therapistId == null || typeof therapistId !== "string") {
      return validationFailure("therapistId is required");
    }
    const therapistIdStr = therapistId.trim();
    if (!therapistIdStr) {
      return validationFailure("therapistId is required");
    }
    if (!isValidObjectIdString(therapistIdStr)) {
      return validationFailure("therapistId must be a valid therapist ID (24 hex characters). Use IDs from the therapist list or Book a session.");
    }

    if (startAt == null || typeof startAt !== "string") {
      return validationFailure("startAt is required");
    }
    const startDate = toDate(startAt.trim());
    if (!startDate) {
      return validationFailure("startAt must be a valid ISO 8601 date (e.g. 2026-02-09T09:00:00.000Z)");
    }

    if (endAt == null || typeof endAt !== "string") {
      return validationFailure("endAt is required");
    }
    const endDate = toDate(endAt.trim());
    if (!endDate) {
      return validationFailure("endAt must be a valid ISO 8601 date (e.g. 2026-02-09T09:30:00.000Z)");
    }
    if (endDate <= startDate) {
      return validationFailure("endAt must be after startAt");
    }

    const therapist = await Therapist.findById(therapistIdStr);
    if (!therapist) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] book 404: therapist not found", therapistIdStr);
      }
      return res.status(404).json({ message: "Therapist not found" });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] book 403: client profile not found", clientId);
      }
      return res.status(403).json({ message: "Client profile not found" });
    }

    const within = await isWithinAvailability(therapistIdStr, startDate, endDate);
    if (!within) {
      return validationFailure("Requested time is not within the therapist's availability for that day.");
    }

    const useTransactions = process.env.NODE_ENV === "production";

    let session;

    if (useTransactions) {
      const mongoSession = await mongoose.startSession();
      try {
        await mongoSession.withTransaction(async () => {
          const therapistConflict = await Session.findOne({
            therapist: therapistIdStr,
            status: { $ne: "cancelled" },
            ...overlapQuery(startDate, endDate),
          })
            .session(mongoSession)
            .lean();
          if (therapistConflict) {
            throw Object.assign(new Error("Slot already booked"), { statusCode: 409 });
          }

          const clientConflict = await Session.findOne({
            client: clientId,
            status: { $ne: "cancelled" },
            ...overlapQuery(startDate, endDate),
          })
            .session(mongoSession)
            .lean();
          if (clientConflict) {
            throw Object.assign(new Error("You already have a session at that time."), { statusCode: 409 });
          }

          const [created] = await Session.create(
            [
              {
                therapist: therapistIdStr,
                client: clientId,
                start: startDate,
                end: endDate,
                status: "scheduled",
                notes: notes ?? null,
              },
            ],
            { session: mongoSession }
          );
          session = created;
        });
      } catch (err) {
        if (err.statusCode === 409) {
          return res.status(409).json({ message: err.message || "Slot already booked" });
        }
        throw err;
      } finally {
        await mongoSession.endSession();
      }
    } else {
      const therapistConflict = await Session.findOne({
        therapist: therapistIdStr,
        status: { $ne: "cancelled" },
        ...overlapQuery(startDate, endDate),
      }).lean();
      if (therapistConflict) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[sessions] book conflict: therapist already has session in range", {
            therapistId: therapistIdStr,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          });
        }
        return res.status(409).json({ message: "Slot already booked" });
      }

      const clientConflict = await Session.findOne({
        client: clientId,
        status: { $ne: "cancelled" },
        ...overlapQuery(startDate, endDate),
      }).lean();
      if (clientConflict) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[sessions] book conflict: client already has session in range", {
            clientId,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          });
        }
        return res.status(409).json({ message: "You already have a session at that time." });
      }

      const [created] = await Session.create([
        {
          therapist: therapistIdStr,
          client: clientId,
          start: startDate,
          end: endDate,
          status: "scheduled",
          notes: notes ?? null,
        },
      ]);
      session = created;
    }

    const populated = await Session.findById(session._id)
      .populate("therapist", "name")
      .populate("client", "name email");

    await safeAudit(req, {
      action: "BOOK_SESSION",
      entityType: "Session",
      entityId: populated._id,
      meta: { therapistId: therapistIdStr, clientId, start: startDate, end: endDate },
    });
    safeEmit(req, "sessions:changed", { type: "booked", sessionId: populated._id });
    await safeSendEmail({
      to: client.email,
      subject: "Session booked",
      text: `Your session is booked with ${therapist.name} on ${startDate.toLocaleString()}.`,
    });

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Slot already booked" });
    }
    const msg = safeMsg(err);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions] book 400 catch:", msg);
      console.debug("[sessions] book req.body:", JSON.stringify(req.body));
      console.debug("[sessions] book req.user:", JSON.stringify(safeUserForLog(req.user)));
    }
    return res.status(400).json({ message: msg });
  }
}

/**
 * Cancel session
 * - checks access (strict)
 * - updates status
 * - audit + websocket + email
 */
export async function cancelSession(req, res) {
  try {
    const existing = await Session.findById(req.params.id)
      .populate("therapist", "name")
      .populate("client", "name email");

    if (!existing) return res.status(404).json({ message: "Session not found" });

    const actorIds = await resolveActorIds(req);
    if (!canAccessSessionStrict(actorIds, existing)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (existing.status === "cancelled") return res.json(existing);

    existing.status = "cancelled";
    await existing.save();

    await safeAudit(req, {
      action: "CANCEL_SESSION",
      entityType: "Session",
      entityId: existing._id,
      meta: { previousStatus: "scheduled" },
    });

    safeEmit(req, "sessions:changed", { type: "cancelled", sessionId: existing._id });

    await safeSendEmail({
      to: existing.client?.email,
      subject: "Session cancelled",
      text: `Your session with ${existing.therapist?.name || "therapist"} on ${new Date(
        existing.start
      ).toLocaleString()} was cancelled.`,
    });

    res.json(existing);
  } catch (err) {
    res.status(400).json({ message: safeMsg(err) });
  }
}

/**
 * POST /api/sessions/:id/reschedule-check
 * Lightweight pre-check for rescheduling. Does NOT modify the database.
 * Body: { startAt: ISO string, endAt: ISO string }.
 * Returns: { canReschedule: boolean, reason?: string, message?: string }.
 *
 * Reasons (non-exhaustive):
 * - "INVALID_TIME" (missing/invalid startAt/endAt or endAt <= startAt)
 * - "PAST" (startAt is in the past)
 * - "NOT_FOUND" (session not found)
 * - "FORBIDDEN" (user not allowed to reschedule this session)
 * - "INVALID_STATUS" (session not scheduled/cancelled)
 * - "NOT_IN_AVAILABILITY" (outside therapist availability)
 * - "CONFLICT" (overlapping session for therapist/client)
 */
export async function checkRescheduleSession(req, res) {
  const makeResult = (canReschedule, reason, message) => {
    const payload = { canReschedule, ...(reason && { reason }), ...(message && { message }) };
    return res.json(payload);
  };

  try {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions] reschedule-check req.body keys:", Object.keys(req.body || {}));
    }

    const startAtRaw = req.body.startAt;
    const endAtRaw = req.body.endAt;

    let reason = null;
    let message = null;

    if (startAtRaw == null || (typeof startAtRaw === "string" && !startAtRaw.trim())) {
      reason = "INVALID_TIME";
      message = "startAt is required";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check INVALID_TIME:", message);
      }
      return makeResult(false, reason, message);
    }
    const start = toDate(typeof startAtRaw === "string" ? startAtRaw.trim() : startAtRaw);
    if (!start) {
      reason = "INVALID_TIME";
      message = "startAt must be a valid ISO 8601 date (e.g. 2026-02-09T09:00:00.000Z)";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check INVALID_TIME:", message);
      }
      return makeResult(false, reason, message);
    }

    if (endAtRaw == null || (typeof endAtRaw === "string" && !endAtRaw.trim())) {
      reason = "INVALID_TIME";
      message = "endAt is required";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check INVALID_TIME:", message);
      }
      return makeResult(false, reason, message);
    }
    const end = toDate(typeof endAtRaw === "string" ? endAtRaw.trim() : endAtRaw);
    if (!end) {
      reason = "INVALID_TIME";
      message = "endAt must be a valid ISO 8601 date (e.g. 2026-02-09T09:30:00.000Z)";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check INVALID_TIME:", message);
      }
      return makeResult(false, reason, message);
    }
    if (end <= start) {
      reason = "INVALID_TIME";
      message = "endAt must be after startAt";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check INVALID_TIME:", message);
      }
      return makeResult(false, reason, message);
    }

    const now = new Date();
    if (start <= now) {
      reason = "PAST";
      message = "Cannot reschedule to a time in the past";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check PAST:", message);
      }
      return makeResult(false, reason, message);
    }

    const existing = await Session.findById(req.params.id)
      .populate("therapist", "name")
      .populate("client", "name email");

    if (!existing) {
      reason = "NOT_FOUND";
      message = "Session not found";
      return makeResult(false, reason, message);
    }

    if (existing.status === "cancelled" || existing.status !== "scheduled") {
      reason = "INVALID_STATUS";
      message = existing.status === "cancelled"
        ? "Cancelled sessions cannot be rescheduled"
        : "Only scheduled sessions can be rescheduled";
      return makeResult(false, reason, message);
    }

    const actorIds = await resolveActorIds(req);
    if (!canAccessSessionStrict(actorIds, existing)) {
      reason = "FORBIDDEN";
      message = "You do not have permission to reschedule this session";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check FORBIDDEN:", safeUserForLog(req.user));
      }
      return makeResult(false, reason, message);
    }

    const therapistId = existing.therapist?._id ?? existing.therapist;
    const clientId = existing.client?._id ?? existing.client;

    const within = await isWithinAvailability(therapistId, start, end);
    if (!within) {
      reason = "NOT_IN_AVAILABILITY";
      message = "New time is not within the therapist's availability for that day.";
      return makeResult(false, reason, message);
    }

    const therapistConflict = await Session.findOne({
      _id: { $ne: existing._id },
      therapist: therapistId,
      status: { $ne: "cancelled" },
      ...overlapQuery(start, end),
    }).lean();
    if (therapistConflict) {
      reason = "CONFLICT";
      message = "Therapist already has a session at that time.";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check therapist CONFLICT", { sessionId: therapistConflict._id });
      }
      return makeResult(false, reason, message);
    }

    const clientConflict = await Session.findOne({
      _id: { $ne: existing._id },
      client: clientId,
      status: { $ne: "cancelled" },
      ...overlapQuery(start, end),
    }).lean();
    if (clientConflict) {
      reason = "CONFLICT";
      message = "You already have a session at that time.";
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule-check client CONFLICT", { sessionId: clientConflict._id });
      }
      return makeResult(false, reason, message);
    }

    return makeResult(true, null, null);
  } catch (err) {
    const msg = safeMsg(err);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions] reschedule-check 500:", msg);
      console.debug("[sessions] reschedule-check req.body keys:", Object.keys(req.body || {}));
    }
    return res.status(500).json({ canReschedule: false, reason: "SERVER_ERROR", message: msg });
  }
}

/**
 * PATCH /api/sessions/:id/reschedule
 * Contract: body must be { startAt: ISO string, endAt: ISO string }.
 * Client: only sessions where session.client matches req.user.clientId.
 * Therapist: only their own sessions; admin: any. 403 if forbidden.
 * Validates: new time within therapist availability, no conflict (excludes current session id).
 */
export async function rescheduleSession(req, res) {
  const validationFailure = (message) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions] reschedule 400:", message);
      console.debug("[sessions] reschedule req.body keys:", Object.keys(req.body || {}));
    }
    return res.status(400).json({ message });
  };

  try {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions] reschedule req.body keys:", Object.keys(req.body || {}));
    }

    const startAtRaw = req.body.startAt ?? req.body.newStart ?? req.body.start;
    const endAtRaw = req.body.endAt ?? req.body.newEnd ?? req.body.end;

    if (startAtRaw == null || (typeof startAtRaw === "string" && !startAtRaw.trim())) {
      return validationFailure("startAt is required");
    }
    const newStart = toDate(typeof startAtRaw === "string" ? startAtRaw.trim() : startAtRaw);
    if (!newStart) {
      return validationFailure("startAt must be a valid ISO 8601 date (e.g. 2026-02-09T09:00:00.000Z)");
    }

    if (endAtRaw == null || (typeof endAtRaw === "string" && !endAtRaw.trim())) {
      return validationFailure("endAt is required");
    }
    const newEnd = toDate(typeof endAtRaw === "string" ? endAtRaw.trim() : endAtRaw);
    if (!newEnd) {
      return validationFailure("endAt must be a valid ISO 8601 date (e.g. 2026-02-09T09:30:00.000Z)");
    }
    if (newEnd <= newStart) {
      return validationFailure("endAt must be after startAt");
    }

    const existing = await Session.findById(req.params.id)
      .populate("therapist", "name")
      .populate("client", "name email");

    if (!existing) return res.status(404).json({ message: "Session not found" });

    if (existing.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled sessions cannot be rescheduled" });
    }
    if (existing.status !== "scheduled") {
      return res.status(400).json({ message: "Only scheduled sessions can be rescheduled" });
    }

    const actorIds = await resolveActorIds(req);
    if (!canAccessSessionStrict(actorIds, existing)) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule 403: access denied", safeUserForLog(req.user));
      }
      return res.status(403).json({ message: "You do not have permission to reschedule this session" });
    }

    const therapistId = existing.therapist?._id ?? existing.therapist;
    const clientId = existing.client?._id ?? existing.client;

    const within = await isWithinAvailability(therapistId, newStart, newEnd);
    if (!within) {
      return validationFailure("New time is not within the therapist's availability for that day.");
    }

    const therapistConflict = await Session.findOne({
      _id: { $ne: existing._id },
      therapist: therapistId,
      status: { $ne: "cancelled" },
      ...overlapQuery(newStart, newEnd),
    }).lean();
    if (therapistConflict) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule 409: therapist conflict", { sessionId: therapistConflict._id });
      }
      return res.status(409).json({ message: "Therapist already has a session at that time." });
    }

    const clientConflict = await Session.findOne({
      _id: { $ne: existing._id },
      client: clientId,
      status: { $ne: "cancelled" },
      ...overlapQuery(newStart, newEnd),
    }).lean();
    if (clientConflict) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[sessions] reschedule 409: client conflict", { sessionId: clientConflict._id });
      }
      return res.status(409).json({ message: "You already have a session at that time." });
    }

    const oldStart = existing.start;
    existing.start = newStart;
    existing.end = newEnd;
    await existing.save();

    await safeAudit(req, {
      action: "RESCHEDULE_SESSION",
      entityType: "Session",
      entityId: existing._id,
      meta: { oldStart, newStart, newEnd },
    });
    safeEmit(req, "sessions:changed", { type: "rescheduled", sessionId: existing._id });
    await safeSendEmail({
      to: existing.client?.email,
      subject: "Session rescheduled",
      text: `Your session was moved from ${new Date(oldStart).toLocaleString()} to ${newStart.toLocaleString()}.`,
    });

    res.json(existing);
  } catch (err) {
    const msg = safeMsg(err);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[sessions] reschedule 400 catch:", msg);
      console.debug("[sessions] reschedule req.body keys:", Object.keys(req.body || {}));
    }
    return res.status(400).json({ message: msg });
  }
}

const ALLOWED_STATUSES = ["scheduled", "cancelled", "completed"];

/**
 * PATCH /api/sessions/:id/status
 * Client: can set only "cancelled" on own session.
 * Therapist: can confirm/complete own (e.g. "scheduled" -> "completed").
 * Admin: can set any status.
 */
export async function updateSessionStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "status must be one of: scheduled, cancelled, completed" });
    }

    const existing = await Session.findById(req.params.id)
      .populate("therapist", "name")
      .populate("client", "name email");

    if (!existing) return res.status(404).json({ message: "Session not found" });

    const actorIds = await resolveActorIds(req);
    if (!canAccessSessionStrict(actorIds, existing)) {
      return res.status(403).json({ message: "You do not have access to this session" });
    }

    if (actorIds.role === "client" && status !== "cancelled") {
      return res.status(403).json({ message: "Clients can only cancel their session, not change to " + status });
    }
    if (actorIds.role === "therapist" && status === "scheduled" && existing.status !== "scheduled") {
      return res.status(400).json({ message: "Therapist cannot set status back to scheduled" });
    }

    existing.status = status;
    await existing.save();

    await safeAudit(req, {
      action: "UPDATE_SESSION_STATUS",
      entityType: "Session",
      entityId: existing._id,
      meta: { status },
    });
    safeEmit(req, "sessions:changed", { type: "status", sessionId: existing._id });
    res.json(existing);
  } catch (err) {
    res.status(400).json({ message: safeMsg(err) });
  }
}

/**
 * DELETE session (admin only - hard delete).
 */
export async function deleteSession(req, res) {
  try {
    const existing = await Session.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Session not found" });

    await Session.findByIdAndDelete(req.params.id);

    await safeAudit(req, {
      action: "DELETE_SESSION",
      entityType: "Session",
      entityId: existing._id,
      meta: {},
    });

    safeEmit(req, "sessions:changed", { type: "deleted", sessionId: existing._id });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: safeMsg(err) });
  }
}


