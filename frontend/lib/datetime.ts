/**
 * Date/time handling: UTC (Instant) at API boundary, local for display/input.
 * Backend: stores Instant (UTC), transports ISO-8601 with Z.
 * Frontend: convert Instant → local for display; local picker → ISO UTC when sending.
 */

/**
 * Parse local date + time (from date/time picker) and return ISO-8601 UTC string (Z).
 * Use when sending to backend: session startAt/endAt, reschedule.
 */
export function localToISOUTC(date: string, time: string): string {
  const local = new Date(`${date}T${time}:00`);
  return local.toISOString();
}

/**
 * Build startAt and endAt in ISO-8601 UTC (Z) from local date, time, and duration.
 * Backend expects e.g. "2026-02-10T18:00:00Z".
 */
export function buildSessionTimesUTC(
  date: string,
  time: string,
  durationMinutes: number = 30
): { startAt: string; endAt: string } {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

/**
 * Build startAt and endAt treating date+time as UTC (for use with public available-slots, which are in UTC).
 */
export function buildSessionTimesAsUTC(
  date: string,
  time: string,
  durationMinutes: number = 30
): { startAt: string; endAt: string } {
  const start = new Date(`${date}T${time}:00.000Z`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

/**
 * Format an ISO-8601 UTC string (Instant) for display in the user's local timezone.
 * Returns { date: "YYYY-MM-DD", time: "HH:mm" } in local time.
 */
export function formatInstantToLocal(isoUtc: string): {
  date: string;
  time: string;
} {
  const d = new Date(isoUtc);
  const date =
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");
  const time =
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0");
  return { date, time };
}

/**
 * Display a session Instant as local date + time string (e.g. for lists/cards).
 */
export function formatInstantForDisplay(isoUtc: string): string {
  return new Date(isoUtc).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}
