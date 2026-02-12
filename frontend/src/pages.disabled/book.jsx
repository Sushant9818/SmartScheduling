import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import { listClients } from "../services/clientAPI";
import { listTherapists } from "../services/therapistAPI";
import { suggestSlots } from "../services/schedulingAPI";
import { bookSession, listSessions, rescheduleSession } from "../services/sessionAPI";

const DnDCalendar = withDragAndDrop(Calendar);

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

const norm = (v) => String(v || "").toLowerCase().trim();
const isScheduled = (status) => norm(status) === "scheduled";

const overlap = (aStart, aEnd, bStart, bEnd) => {
  const A1 = new Date(aStart).getTime();
  const A2 = new Date(aEnd).getTime();
  const B1 = new Date(bStart).getTime();
  const B2 = new Date(bEnd).getTime();
  return A1 < B2 && A2 > B1;
};

export default function BookSession() {
  const { user } = useAuth();
  const canBook =
    !!user && (user.role === "client" || user.role === "admin" || user.role === "therapist");

  // ✅ SSR-safe query (Next.js): read window ONLY inside useEffect
  const [query, setQuery] = useState({
    mode: null,
    sessionId: "",
    clientId: "",
    therapistId: "",
    oldStart: "",
    oldEnd: "",
    ready: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const p = new URLSearchParams(window.location.search);
    setQuery({
      mode: p.get("mode"),
      sessionId: p.get("sessionId") || "",
      clientId: p.get("clientId") || "",
      therapistId: p.get("therapistId") || "",
      oldStart: p.get("oldStart") || "",
      oldEnd: p.get("oldEnd") || "",
      ready: true,
    });
  }, []);

  const isReschedule = query.mode === "reschedule";
  const sessionId = query.sessionId;
  const oldStart = query.oldStart;
  const oldEnd = query.oldEnd;

  const [clients, setClients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [clientId, setClientId] = useState("");
  const [therapistId, setTherapistId] = useState("");

  const [bookedEvents, setBookedEvents] = useState([]);
  const [suggestedEvents, setSuggestedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = useMemo(() => new Date(), []);
  const to = useMemo(() => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), []);

  // 🔒 Current session block (shown only in reschedule mode if oldStart/oldEnd provided)
  const currentEvent = useMemo(() => {
    if (!isReschedule || !oldStart || !oldEnd) return null;
    return {
      id: "current-session",
      title: "Current Session (locked)",
      start: new Date(oldStart),
      end: new Date(oldEnd),
      kind: "current",
    };
  }, [isReschedule, oldStart, oldEnd]);

  // ✅ Load only scheduled sessions to block calendar
  // ✅ IMPORTANT: exclude the session being rescheduled so it doesn't block itself
  const loadSessions = async () => {
    setError("");
    try {
      const res = await listSessions();
      const data = res.data || [];

      const events = data
        .filter((s) => isScheduled(s.status))
        .filter((s) => !isReschedule || String(s._id) !== String(sessionId)) // ✅ key fix
        .map((s) => ({
          id: s._id,
          title: `Booked: ${s.client?.name || "Client"}`,
          start: new Date(s.start),
          end: new Date(s.end),
          kind: "booked",
          therapistId: s.therapist?._id,
          clientId: s.client?._id,
        }));

      setBookedEvents(events);
    } catch (e) {
      console.error("LOAD SESSIONS ERROR:", e);
      setError(e?.response?.data?.message || "Failed to load booked sessions");
      setBookedEvents([]);
    }
  };

  // ✅ init: load clients/therapists after query is ready
  useEffect(() => {
    if (!query.ready) return;

    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([listClients(), listTherapists()]);
        const c = cRes.data || [];
        const t = tRes.data || [];

        setClients(c);
        setTherapists(t);

        if (isReschedule) {
          // from URL
          setClientId(query.clientId);
          setTherapistId(query.therapistId);
        } else {
          // defaults
          if (c[0]) setClientId(c[0]._id);
          if (t[0]) setTherapistId(t[0]._id);
        }

        await loadSessions();
      } catch (e) {
        console.error("INIT ERROR:", e);
        setError("Failed to load booking data");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.ready, isReschedule, query.clientId, query.therapistId]);

  const onSuggest = async () => {
    if (!canBook) return setError("Login required.");
    if (!clientId || !therapistId) return setError("Select client and therapist.");

    setLoading(true);
    setError("");
    try {
      const res = await suggestSlots({
        clientId,
        therapistId,
        from: from.toISOString(),
        to: to.toISOString(),
        sessionMinutes: 60,
      });

      const suggested = (res.data?.rankedSlots || []).map((s, i) => ({
        id: `s-${i}`,
        title: `Suggested (score ${Math.round(s.score)})`,
        start: new Date(s.start),
        end: new Date(s.end),
        kind: "suggested",
      }));

      setSuggestedEvents(suggested);
      if (suggested.length === 0) setError("No overlapping slots found.");
    } catch (e) {
      console.error("SUGGEST ERROR:", e);
      setError(e?.response?.data?.message || "Suggest slots failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Auto-suggest when rescheduling (so user doesn't need to press button)
  useEffect(() => {
    if (query.ready && isReschedule && clientId && therapistId) {
      onSuggest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.ready, isReschedule, clientId, therapistId]);

  const goToSessions = () => {
    if (typeof window !== "undefined") window.location.href = "/sessions";
  };

  // ✅ Click suggested slot: book OR reschedule
  const onSelectEvent = async (evt) => {
    if (evt.kind !== "suggested") return;

    // Block choosing the same locked slot (optional)
    if (currentEvent && overlap(evt.start, evt.end, currentEvent.start, currentEvent.end)) {
      alert("❌ Please choose a different slot (current slot is locked).");
      return;
    }

    try {
      if (isReschedule) {
        if (!sessionId) return alert("Missing sessionId for reschedule.");

        await rescheduleSession(sessionId, {
          start: evt.start.toISOString(),
          end: evt.end.toISOString(),
        });

        alert("✅ Session rescheduled!");
        goToSessions();
      } else {
        await bookSession({
          therapistId,
          clientId,
          start: evt.start.toISOString(),
          end: evt.end.toISOString(),
        });

        alert("✅ Session booked!");
        setSuggestedEvents([]);
        await loadSessions();
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Operation failed");
    }
  };

  // 🔒 Role-based DnD permissions: Admin + Therapist only
  const canDrag = (event) => {
    if (!user) return false;
    if (event.kind !== "booked") return false;

    if (user.role === "admin") return true;

    if (user.role === "therapist") {
      const uid = String(user._id || user.id || user.sub || "");
      return String(event.therapistId || "") === uid;
    }

    return false;
  };

  // 🖱 Drag drop handler (reschedule booked sessions)
  const onEventDrop = async ({ event, start, end }) => {
    if (!canDrag(event)) return;

    if (currentEvent && overlap(start, end, currentEvent.start, currentEvent.end)) {
      alert("❌ You can’t move into the current locked slot.");
      return;
    }

    try {
      await rescheduleSession(event.id, {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      });
      alert("✅ Session moved");
      await loadSessions();
    } catch (e) {
      alert(e?.response?.data?.message || "Move failed");
    }
  };

  // ✅ Combine events: show locked current session first
  const events = useMemo(() => {
    const all = [...bookedEvents, ...suggestedEvents];
    return currentEvent ? [currentEvent, ...all] : all;
  }, [bookedEvents, suggestedEvents, currentEvent]);

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="h2">{isReschedule ? "Reschedule Session" : "Book Session"}</div>
        <div className="p">
          {isReschedule
            ? "Pick a suggested slot to reschedule. (Current slot is locked)"
            : "Click a suggested slot to book it."}
        </div>

        {error ? <div className="alert">{error}</div> : null}

        <div className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isReschedule}
            >
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
              disabled={isReschedule}
            >
              {therapists.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button className="btn" onClick={onSuggest} disabled={loading}>
              {loading ? "Finding..." : "Suggest Slots (2 weeks)"}
            </button>

            <button className="btn secondary" onClick={loadSessions}>
              Refresh
            </button>

            {isReschedule ? (
              <button className="btn secondary" onClick={goToSessions}>
                Back
              </button>
            ) : null}
          </div>

          <div className="p" style={{ marginTop: 8, opacity: 0.8 }}>
            Drag-and-drop reschedule is enabled for <b>Admin</b> and <b>Therapist</b>.
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 650 }}
            onSelectEvent={onSelectEvent}
            onEventDrop={onEventDrop}
            resizable={false}
            draggableAccessor={canDrag}
            eventPropGetter={(event) => ({
              style: {
                borderRadius: "12px",
                border: "1px solid #ddd",
                opacity: event.kind === "suggested" ? 0.9 : 1,
                backgroundColor: event.kind === "current" ? "#ffe8a3" : undefined,
                cursor:
                  event.kind === "suggested"
                    ? "pointer"
                    : event.kind === "booked"
                    ? "grab"
                    : "not-allowed",
              },
            })}
          />
        </div>
      </div>
    </>
  );
}


