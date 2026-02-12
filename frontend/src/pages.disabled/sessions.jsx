import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { listSessions, cancelSession } from "../services/sessionAPI";

export default function SessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [err, setErr] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  const load = async () => {
    setErr("");
    try {
      const res = await listSessions();
      setSessions(res.data || []);
    } catch (e) {
      console.error("LIST SESSIONS ERROR:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
      setErr(e?.response?.data?.message || "Failed to load sessions");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const bookedSessions = useMemo(
    () => (sessions || []).filter((s) => s.status !== "cancelled"),
    [sessions]
  );

  const cancelledSessions = useMemo(
    () => (sessions || []).filter((s) => s.status === "cancelled"),
    [sessions]
  );

  const visibleSessions = useMemo(() => {
    if (showCancelled) return sessions || [];
    return bookedSessions;
  }, [showCancelled, sessions, bookedSessions]);

  const onCancel = async (id) => {
    setErr("");
    try {
      await cancelSession(id);

      // Update UI instantly
      setSessions((prev) =>
        (prev || []).map((s) => (s._id === id ? { ...s, status: "cancelled" } : s))
      );
    } catch (e) {
      console.error("CANCEL ERROR:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
      setErr(e?.response?.data?.message || "Failed to cancel session");
    }
  };

  // ✅ NEW: open Book Session page for rescheduling
  const onReschedule = (s) => {
    setErr("");

    // Only scheduled sessions can be rescheduled
    if (s.status !== "scheduled") return;

    window.location.href =
      `/book?mode=reschedule&sessionId=${s._id}` +
      `&clientId=${s.client?._id || ""}` +
      `&therapistId=${s.therapist?._id || ""}` +
      `&oldStart=${encodeURIComponent(s.start)}` +
      `&oldEnd=${encodeURIComponent(s.end)}`;
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="h2">Sessions</div>
        <div className="p">Cancel or reschedule booked sessions.</div>

        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="p" style={{ opacity: 0.85 }}>
            Booked: <b>{bookedSessions.length}</b> &nbsp;|&nbsp; Cancelled:{" "}
            <b>{cancelledSessions.length}</b>
          </div>

          <button
            className="btn secondary"
            onClick={() => setShowCancelled((v) => !v)}
            title="Toggle cancelled sessions"
          >
            {showCancelled ? "Hide Cancelled" : "Show Cancelled"}
          </button>
        </div>

        {err ? <div className="alert">{err}</div> : null}

        <div className="card" style={{ marginTop: 12 }}>
          {visibleSessions.length === 0 ? (
            <div className="p">{showCancelled ? "No sessions." : "No booked sessions."}</div>
          ) : (
            visibleSessions.map((s) => {
              const canReschedule = s.status === "scheduled";
              const canCancel = s.status !== "cancelled";

              return (
                <div
                  key={s._id}
                  className="row"
                  style={{ justifyContent: "space-between", marginBottom: 10 }}
                >
                  <div>
                    <b>{s.client?.name || "Client"}</b> → {s.therapist?.name || "Therapist"}
                    <div className="p">
                      {new Date(s.start).toLocaleString()} - {new Date(s.end).toLocaleTimeString()}
                    </div>
                    <span className="badge">{s.status}</span>
                  </div>

                  <div className="row">
                    <button
                      className="btn secondary"
                      onClick={() => onReschedule(s)}
                      disabled={!canReschedule}
                      title={!canReschedule ? "Only scheduled sessions can be rescheduled" : "Reschedule"}
                    >
                      Reschedule
                    </button>

                    <button
                      className="btn"
                      onClick={() => onCancel(s._id)}
                      disabled={!canCancel}
                      title={!canCancel ? "Already cancelled" : "Cancel"}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

