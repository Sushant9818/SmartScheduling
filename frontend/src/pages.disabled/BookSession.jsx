import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { listClients } from "../services/clientAPI";
import { listTherapists } from "../services/therapistAPI";
import { suggestSlots } from "../services/schedulingAPI";
import { bookSession, listSessions, rescheduleSession } from "../services/sessionAPI";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

export default function BookSession() {
  // ✅ Read query params safely (no window during SSR)
  const [query, setQuery] = useState({
    mode: null,
    sessionId: null,
    clientId: "",
    therapistId: "",
    oldStart: null,
    oldEnd: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setQuery({
      mode: params.get("mode"),
      sessionId: params.get("sessionId"),
      clientId: params.get("clientId") || "",
      therapistId: params.get("therapistId") || "",
      oldStart: params.get("oldStart"),
      oldEnd: params.get("oldEnd"),
    });
  }, []);

  const isReschedule = query.mode === "reschedule";
  const sessionId = query.sessionId;

  const [clients, setClients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [clientId, setClientId] = useState("");
  const [therapistId, setTherapistId] = useState("");

  const [bookedEvents, setBookedEvents] = useState([]);
  const [suggestedEvents, setSuggestedEvents] = useState([]);
  const [error, setError] = useState("");

  const from = useMemo(() => new Date(), []);
  const to = useMemo(() => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), []);

  // ✅ only scheduled sessions block calendar
  const loadSessions = async () => {
    const res = await listSessions();
    const events = (res.data || [])
      .filter((s) => s.status === "scheduled")
      .map((s) => ({
        id: s._id,
        title: `Booked`,
        start: new Date(s.start),
        end: new Date(s.end),
        kind: "booked",
      }));
    setBookedEvents(events);
  };

  // ✅ Initialize client/therapist after query loads
  useEffect(() => {
    (async () => {
      const [cRes, tRes] = await Promise.all([listClients(), listTherapists()]);
      const c = cRes.data || [];
      const t = tRes.data || [];

      setClients(c);
      setTherapists(t);

      if (isReschedule) {
        // take from query
        setClientId(query.clientId);
        setTherapistId(query.therapistId);
      } else {
        // defaults
        if (c[0]) setClientId(c[0]._id);
        if (t[0]) setTherapistId(t[0]._id);
      }

      await loadSessions();
    })();
    // re-run once query is ready
  }, [isReschedule, query.clientId, query.therapistId]);

  const onSuggest = async () => {
    if (!clientId || !therapistId) {
      setError("Select client and therapist");
      return;
    }

    const res = await suggestSlots({
      clientId,
      therapistId,
      from: from.toISOString(),
      to: to.toISOString(),
      sessionMinutes: 60,
    });

    const suggested = (res.data?.rankedSlots || []).map((s, i) => ({
      id: `s-${i}`,
      title: `Suggested`,
      start: new Date(s.start),
      end: new Date(s.end),
      kind: "suggested",
    }));

    setSuggestedEvents(suggested);
  };

  const goToSessions = () => {
    window.location.href = "/sessions";
  };

  const onSelectEvent = async (evt) => {
    if (evt.kind !== "suggested") return;

    try {
      if (isReschedule) {
        if (!sessionId) {
          alert("Missing sessionId for reschedule");
          return;
        }

        await rescheduleSession(sessionId, {
          start: evt.start.toISOString(),
          end: evt.end.toISOString(),
        });

        alert("✅ Session rescheduled");
        goToSessions();
      } else {
        await bookSession({
          therapistId,
          clientId,
          start: evt.start.toISOString(),
          end: evt.end.toISOString(),
        });

        alert("✅ Session booked");
        await loadSessions();
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Operation failed");
    }
  };

  const events = [...bookedEvents, ...suggestedEvents];

  return (
    <div className="container">
      <div className="h2">{isReschedule ? "Reschedule Session" : "Book Session"}</div>
      <div className="p">
        {isReschedule ? "Pick a new slot to reschedule." : "Pick a suggested slot to book."}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card">
        <select value={clientId} disabled={isReschedule} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <select value={therapistId} disabled={isReschedule} onChange={(e) => setTherapistId(e.target.value)}>
          {therapists.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>

        <button className="btn" onClick={onSuggest}>
          Suggest Slots
        </button>

        {isReschedule && (
          <button className="btn secondary" onClick={goToSessions}>
            Back
          </button>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 650 }}
          onSelectEvent={onSelectEvent}
        />
      </div>
    </div>
  );
}

