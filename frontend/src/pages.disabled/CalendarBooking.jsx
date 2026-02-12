import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { listClients } from "../services/clientAPI";
import { listTherapists } from "../services/therapistAPI";
import { suggestSlots } from "../services/schedulingAPI";
import { bookSession, listSessions } from "../services/sessionAPI";

const locales = { "en-US": require("date-fns/locale/en-US") };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const norm = (v) => String(v || "").toLowerCase().trim();
const isCancelled = (status) => ["cancelled", "canceled"].includes(norm(status));

export default function CalendarBooking() {
  const [clients, setClients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [clientId, setClientId] = useState("");
  const [therapistId, setTherapistId] = useState("");

  const [events, setEvents] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [err, setErr] = useState("");

  const [range, setRange] = useState({
    from: new Date(),
    to: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const [cRes, tRes] = await Promise.all([listClients(), listTherapists()]);
        const c = cRes.data || [];
        const t = tRes.data || [];
        setClients(c);
        setTherapists(t);
        if (c[0]) setClientId(c[0]._id);
        if (t[0]) setTherapistId(t[0]._id);
      } catch (e) {
        console.error("INIT ERROR:", e);
        setErr(e?.response?.data?.message || "Failed to load clients/therapists");
      }
    })();
  }, []);

  const loadSessions = async () => {
    setErr("");
    try {
      const sRes = await listSessions();
      const data = sRes.data || [];

      // ✅ only scheduled sessions (and exclude cancelled/canceled just in case)
      const mapped = data
        .filter((s) => norm(s.status) === "scheduled" && !isCancelled(s.status))
        .map((s) => ({
          id: s._id,
          title: `Booked: ${s.client?.name || "Client"}`,
          start: new Date(s.start),
          end: new Date(s.end),
          kind: "booked",
        }));

      setEvents(mapped);
    } catch (e) {
      console.error("LOAD SESSIONS ERROR:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
      setErr(e?.response?.data?.message || "Failed to load booked sessions");
      setEvents([]);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const suggest = async () => {
    if (!clientId || !therapistId) return;

    setErr("");
    try {
      const res = await suggestSlots({
        clientId,
        therapistId,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        sessionMinutes: 60,
      });

      const slots = (res.data?.rankedSlots || []).map((s, i) => ({
        id: `sug-${i}`,
        title: `Suggested (score ${Math.round(s.score)})`,
        start: new Date(s.start),
        end: new Date(s.end),
        kind: "suggested",
        raw: s,
      }));

      setSuggested(slots);
    } catch (e) {
      console.error("SUGGEST ERROR:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
      setErr(e?.response?.data?.message || "Failed to suggest slots");
    }
  };

  const allEvents = useMemo(() => [...events, ...suggested], [events, suggested]);

  const onSelectEvent = async (evt) => {
    if (evt.kind !== "suggested") return;

    setErr("");
    try {
      await bookSession({
        therapistId,
        clientId,
        start: evt.start.toISOString(),
        end: evt.end.toISOString(),
      });

      alert("Booked successfully!");
      setSuggested([]);
      await loadSessions(); // refresh booked sessions (cancelled won't show)
    } catch (e) {
      console.error("BOOK ERROR:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
      setErr(e?.response?.data?.message || "Failed to book session");
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendar Booking</h1>
          <p className="text-sm opacity-70">Click a suggested slot to book it.</p>
          {err ? <p className="text-sm text-red-600 mt-2">{err}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="border rounded px-2 py-1"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="border rounded px-2 py-1"
            value={therapistId}
            onChange={(e) => setTherapistId(e.target.value)}
          >
            {therapists.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          <button className="bg-black text-white rounded px-3 py-1" onClick={suggest}>
            Suggest Slots (2 weeks)
          </button>

          <button className="border rounded px-3 py-1" onClick={loadSessions} title="Refresh booked sessions">
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-xl shadow p-2">
        <Calendar
          localizer={localizer}
          events={allEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 650 }}
          onSelectEvent={onSelectEvent}
          eventPropGetter={(event) => ({
            style: {
              borderRadius: "10px",
              border: "1px solid #ddd",
              opacity: event.kind === "suggested" ? 0.9 : 1,
            },
          })}
        />
      </div>

      <div className="mt-3 text-sm opacity-70">
        <span className="font-medium">Tip:</span> If you don’t see suggestions, make sure therapist availability +
        client preferred days/times overlap.
      </div>
    </div>
  );
}
