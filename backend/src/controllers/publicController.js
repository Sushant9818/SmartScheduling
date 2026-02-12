import Availability from "../models/Availability.js";
import Session from "../models/Session.js";
import Therapist from "../models/Therapist.js";

const DAYS_ENUM = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

/**
 * GET /api/public/available-slots?date=YYYY-MM-DD&durationMinutes=30
 * Returns therapists with at least one free slot on the given date.
 * Slots are generated from Availability (weekly) for that weekday; slots overlapping
 * existing (non-cancelled) sessions are excluded. Uses UTC for conflict checking.
 */
export async function getAvailableSlots(req, res) {
  try {
    const dateStr = req.query.date;
    const durationMinutes = Math.max(5, Math.min(120, Number(req.query.durationMinutes) || 30));

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ message: "date is required and must be YYYY-MM-DD" });
    }

    const dateObj = new Date(dateStr + "T12:00:00.000Z");
    if (Number.isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const dayOfWeek = DAYS_ENUM[dateObj.getUTCDay()];

    const availabilityDocs = await Availability.find({ dayOfWeek }).lean();
    const byTherapist = new Map();
    for (const a of availabilityDocs) {
      const tid = String(a.therapist);
      if (!byTherapist.has(tid)) {
        byTherapist.set(tid, []);
      }
      byTherapist.get(tid).push({ startTime: a.startTime, endTime: a.endTime });
    }

    const therapistIds = [...byTherapist.keys()];
    const therapists = await Therapist.find({ _id: { $in: therapistIds } })
      .select("_id name")
      .lean();
    const nameById = new Map(therapists.map((t) => [String(t._id), t.name || "Therapist"]));

    function timeToMinutes(t) {
      const [h, m] = t.split(":").map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    }

    function minutesToTime(m) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }

    function generateSlotTimes(ranges, durationMin) {
      const set = new Set();
      for (const { startTime, endTime } of ranges) {
        let m = timeToMinutes(startTime);
        const endM = timeToMinutes(endTime);
        while (m + durationMin <= endM) {
          set.add(minutesToTime(m));
          m += durationMin;
        }
      }
      return [...set].sort();
    }

    const result = [];

    for (const therapistId of therapistIds) {
      const ranges = byTherapist.get(therapistId);
      const allSlots = generateSlotTimes(ranges, durationMinutes);
      if (allSlots.length === 0) continue;

      const freeSlots = [];
      for (const timeStr of allSlots) {
        const startAt = new Date(`${dateStr}T${timeStr}:00.000Z`);
        const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

        const overlapping = await Session.findOne({
          therapist: therapistId,
          status: { $ne: "cancelled" },
          start: { $lt: endAt },
          end: { $gt: startAt },
        });

        if (!overlapping) {
          freeSlots.push(timeStr);
        }
      }

      if (freeSlots.length > 0) {
        result.push({
          therapistId,
          therapistName: nameById.get(therapistId) ?? "Therapist",
          slots: freeSlots.sort(),
        });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err?.message ?? "Failed to get available slots" });
  }
}
