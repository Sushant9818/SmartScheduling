import Therapist from "../models/Therapist.js";
import Client from "../models/Client.js";
import Session from "../models/Session.js";
import { overlapInterval } from "../utils/time.js";

function applyHardConstraints(day, interval, hardConstraints) {
  if (!hardConstraints) return interval;

  const { noEarlyThan, noLaterThan } = hardConstraints;
  let start = new Date(interval.start);
  let end = new Date(interval.end);

  if (noEarlyThan) {
    const [h, m] = noEarlyThan.split(":").map(Number);
    const minStart = new Date(day);
    minStart.setHours(h, m, 0, 0);
    if (start < minStart) start = minStart;
  }

  if (noLaterThan) {
    const [h, m] = noLaterThan.split(":").map(Number);
    const maxEnd = new Date(day);
    maxEnd.setHours(h, m, 0, 0);
    if (end > maxEnd) end = maxEnd;
  }

  if (start >= end) return null;
  return { start, end };
}

export async function findSlots({ clientId, therapistId, from, to, sessionMinutes = 60 }) {
  const [client, therapist] = await Promise.all([
    Client.findById(clientId),
    Therapist.findById(therapistId)
  ]);
  if (!client || !therapist) throw new Error("Client or therapist not found");

  const sessions = await Session.find({
    therapist: therapistId,
    status: "scheduled",
    start: { $lt: to },
    end: { $gt: from }
  });

  const slots = [];
  let day = new Date(from);

  while (day < to) {
    const dow = day.getDay();
    const pref = client.preferences || {};

    // if client picked days, enforce
    if (pref.preferredDaysOfWeek?.length && !pref.preferredDaysOfWeek.includes(dow)) {
      day.setDate(day.getDate() + 1);
      continue;
    }

    const availBlocks = therapist.weeklyAvailability.filter(b => b.dayOfWeek === dow);

    for (const block of availBlocks) {
      const blockStart = new Date(day);
      const blockEnd = new Date(day);
      const [sh, sm] = block.startTime.split(":").map(Number);
      const [eh, em] = block.endTime.split(":").map(Number);
      blockStart.setHours(sh, sm, 0, 0);
      blockEnd.setHours(eh, em, 0, 0);

      const timeRanges = pref.preferredTimeRanges?.length
        ? pref.preferredTimeRanges
        : [{ startTime: block.startTime, endTime: block.endTime }];

      for (const tr of timeRanges) {
        const prefStart = new Date(day);
        const prefEnd = new Date(day);
        const [psh, psm] = tr.startTime.split(":").map(Number);
        const [peh, pem] = tr.endTime.split(":").map(Number);
        prefStart.setHours(psh, psm, 0, 0);
        prefEnd.setHours(peh, pem, 0, 0);

        let interval = overlapInterval(
          { start: blockStart, end: blockEnd },
          { start: prefStart, end: prefEnd }
        );
        if (!interval) continue;

        interval = applyHardConstraints(day, interval, pref.hardConstraints);
        if (!interval) continue;

        // exclude time off (simple: if fully blocked, skip)
        for (const off of therapist.timeOff) {
          const offInt = overlapInterval(interval, off);
          if (offInt && offInt.start <= interval.start && offInt.end >= interval.end) {
            interval = null;
            break;
          }
        }
        if (!interval) continue;

        // exclude sessions (simple: if fully blocked, skip)
        for (const s of sessions) {
          const sInt = overlapInterval(interval, s);
          if (sInt && sInt.start <= interval.start && sInt.end >= interval.end) {
            interval = null;
            break;
          }
        }
        if (!interval) continue;

        // slice into slots
        const cur = new Date(interval.start);
        while (cur.getTime() + sessionMinutes * 60000 <= interval.end.getTime()) {
          const slotEnd = new Date(cur.getTime() + sessionMinutes * 60000);
          slots.push({ therapist: therapistId, start: new Date(cur), end: slotEnd });
          cur.setMinutes(cur.getMinutes() + sessionMinutes);
        }
      }
    }

    day.setDate(day.getDate() + 1);
  }

  return { client, therapist, slots };
}

export function rankSlots(slots, { client }) {
  const ranked = slots.map(slot => {
    let score = 0;

    // preference boost
    if (client.preferences?.preferredTherapistIds?.some(id => id.toString() === slot.therapist.toString())) {
      score += 50;
    }

    // sooner is better
    const daysAway = (slot.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysAway);

    return { ...slot, score };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

  