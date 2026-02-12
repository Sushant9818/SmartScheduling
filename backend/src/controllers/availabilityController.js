import mongoose from "mongoose";
import Availability from "../models/Availability.js";
import Therapist from "../models/Therapist.js";

const HHMM_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const DAYS_ENUM = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function isValidTime(str) {
  return typeof str === "string" && HHMM_REGEX.test(str.trim());
}

function timeToMinutes(str) {
  const [h, m] = str.trim().split(":").map(Number);
  return h * 60 + m;
}

function normalizeDayOfWeek(value) {
  if (typeof value === "string") {
    const u = value.trim().toUpperCase();
    if (DAYS_ENUM.includes(u)) return u;
  }
  if (typeof value === "number" && value >= 0 && value <= 6) {
    return DAYS_ENUM[value] || DAYS_ENUM[0];
  }
  return null;
}

/** Resolve therapist ObjectId for current user (therapist role). req.user.therapist is set by requireAuth from User doc. */
function getTherapistIdForUser(req) {
  if (req.user?.role !== "therapist") return null;
  return req.user.therapist || null;
}

/** Check if two time ranges overlap: [start1,end1) and [start2,end2) */
function timesOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && e1 > s2;
}

/** Find overlapping slots for same therapist and day. Exclude optional slotId (for update). */
async function findOverlappingSlots(therapistId, dayOfWeek, startTime, endTime, excludeId = null) {
  const filter = { therapist: therapistId, dayOfWeek };
  if (excludeId) filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  const slots = await Availability.find(filter).lean();
  return slots.filter((s) => timesOverlap(s.startTime, s.endTime, startTime, endTime));
}

/**
 * GET /api/availability?therapistId=...
 * - therapist: can only view own (therapistId ignored, uses req.user.therapist)
 * - admin: must provide therapistId to view that therapist's slots
 */
export async function getAvailability(req, res) {
  try {
    const { therapistId } = req.query;

    if (req.user?.role === "therapist") {
      const myTherapistId = getTherapistIdForUser(req);
      if (!myTherapistId) {
        return res.json([]);
      }
      const list = await Availability.find({ therapist: myTherapistId })
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();
      const withId = list.map((d) => ({ ...d, id: String(d._id), therapistId: String(d.therapist) }));
      return res.json(withId);
    }

    if (req.user?.role === "admin") {
      const tid = therapistId != null && String(therapistId).trim() !== "" ? String(therapistId).trim() : null;
      if (!tid) {
        return res.json([]);
      }
      const list = await Availability.find({ therapist: new mongoose.Types.ObjectId(tid) })
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();
      const withId = list.map((d) => ({ ...d, id: String(d._id), therapistId: String(d.therapist) }));
      return res.json(withId);
    }

    if (req.user?.role === "client") {
      const tid = therapistId != null && String(therapistId).trim() !== "" ? String(therapistId).trim() : null;
      if (!tid) {
        return res.json([]);
      }
      const list = await Availability.find({ therapist: new mongoose.Types.ObjectId(tid) })
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();
      const withId = list.map((d) => ({ ...d, id: String(d._id), therapistId: String(d.therapist) }));
      return res.json(withId);
    }

    return res.json([]);
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to list availability" });
  }
}

/**
 * POST /api/availability
 * Body: { therapistId?, dayOfWeek, startTime, endTime, recurringWeekly? }
 * - therapist: therapistId ignored, forced to req.user.therapist
 * - admin: therapistId required
 */
export async function createAvailability(req, res) {
  try {
    let { therapistId, dayOfWeek, startTime, endTime, recurringWeekly } = req.body;

    let therapistObjectId;

    if (req.user?.role === "therapist") {
      const myId = getTherapistIdForUser(req);
      if (!myId) {
        return res.status(403).json({ message: "Therapist profile not found for this user" });
      }
      therapistObjectId = myId;
    } else if (req.user?.role === "admin") {
      if (!therapistId || String(therapistId).trim() === "") {
        return res.status(400).json({ message: "therapistId is required for admin" });
      }
      therapistObjectId = new mongoose.Types.ObjectId(String(therapistId).trim());
      const exists = await Therapist.findById(therapistObjectId);
      if (!exists) {
        return res.status(404).json({ message: "Therapist not found" });
      }
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    const day = normalizeDayOfWeek(dayOfWeek);
    if (!day) {
      return res.status(400).json({ message: "dayOfWeek must be 0-6 or a day name (e.g. MONDAY)" });
    }

    if (!isValidTime(startTime)) {
      return res.status(400).json({ message: "startTime must be HH:mm (e.g. 09:00)" });
    }
    if (!isValidTime(endTime)) {
      return res.status(400).json({ message: "endTime must be HH:mm (e.g. 17:00)" });
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      return res.status(400).json({ message: "endTime must be after startTime" });
    }

    const overlapping = await findOverlappingSlots(
      therapistObjectId,
      day,
      startTime.trim(),
      endTime.trim(),
      null
    );
    if (overlapping.length > 0) {
      return res.status(409).json({ message: "This slot overlaps with an existing slot for the same day" });
    }

    const doc = await Availability.create({
      therapist: therapistObjectId,
      dayOfWeek: day,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      recurringWeekly: recurringWeekly !== false,
      createdBy: req.user?.sub ? new mongoose.Types.ObjectId(req.user.sub) : null,
    });

    const payload = doc.toObject();
    payload.id = String(payload._id);
    payload.therapistId = String(payload.therapist);
    res.status(201).json(payload);
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors || {}).map((e) => e.message).join("; ") || err.message;
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: err?.message || "Failed to create availability" });
  }
}

/**
 * PATCH /api/availability/:id
 * Body: { dayOfWeek?, startTime?, endTime?, recurringWeekly? }
 * - therapist: can update only their own slot
 * - admin: can update any slot
 */
export async function updateAvailability(req, res) {
  try {
    const doc = await Availability.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Availability not found" });
    }

    if (req.user?.role === "therapist") {
      const myId = getTherapistIdForUser(req);
      if (!myId || String(doc.therapist) !== String(myId)) {
        return res.status(403).json({ message: "You can only update your own availability" });
      }
    }

    const { dayOfWeek, startTime, endTime, recurringWeekly } = req.body;

    const day = dayOfWeek !== undefined ? normalizeDayOfWeek(dayOfWeek) : doc.dayOfWeek;
    if (dayOfWeek !== undefined && !day) {
      return res.status(400).json({ message: "dayOfWeek must be 0-6 or a day name (e.g. MONDAY)" });
    }

    const start = startTime !== undefined ? startTime : doc.startTime;
    const end = endTime !== undefined ? endTime : doc.endTime;

    if (startTime !== undefined && !isValidTime(start)) {
      return res.status(400).json({ message: "startTime must be HH:mm" });
    }
    if (endTime !== undefined && !isValidTime(end)) {
      return res.status(400).json({ message: "endTime must be HH:mm" });
    }

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    if (endMin <= startMin) {
      return res.status(400).json({ message: "endTime must be after startTime" });
    }

    const overlapping = await findOverlappingSlots(doc.therapist, day, start, end, doc._id);
    if (overlapping.length > 0) {
      return res.status(409).json({ message: "This slot overlaps with an existing slot for the same day" });
    }

    if (dayOfWeek !== undefined) doc.dayOfWeek = day;
    if (startTime !== undefined) doc.startTime = start.trim();
    if (endTime !== undefined) doc.endTime = end.trim();
    if (recurringWeekly !== undefined) doc.recurringWeekly = recurringWeekly;
    await doc.save();

    const payload = doc.toObject();
    payload.id = String(payload._id);
    payload.therapistId = String(payload.therapist);
    res.json(payload);
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors || {}).map((e) => e.message).join("; ") || err.message;
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: err?.message || "Failed to update availability" });
  }
}

/**
 * DELETE /api/availability/:id
 * - therapist: can delete only their own slot
 * - admin: can delete any slot
 */
export async function deleteAvailability(req, res) {
  try {
    const doc = await Availability.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Availability not found" });
    }

    if (req.user?.role === "therapist") {
      const myId = getTherapistIdForUser(req);
      if (!myId || String(doc.therapist) !== String(myId)) {
        return res.status(403).json({ message: "You can only delete your own availability" });
      }
    }

    await Availability.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to delete availability" });
  }
}

/** Alias for getAvailability (used by adminRoutes). */
export const listAvailability = getAvailability;

/**
 * Admin only: list all availability slots across all therapists.
 * Used by GET /api/admin/availability with no filter.
 */
export async function listAllAvailability(req, res) {
  try {
    const list = await Availability.find({})
      .sort({ therapist: 1, dayOfWeek: 1, startTime: 1 })
      .lean();
    const withId = list.map((d) => ({ ...d, id: String(d._id), therapistId: String(d.therapist) }));
    return res.json(withId);
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to list availability" });
  }
}
