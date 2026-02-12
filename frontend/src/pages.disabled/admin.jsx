import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { getSummary } from "../services/adminAPI";

export default function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const isAdmin = !!user && user.role === "admin";

  useEffect(() => {
    (async () => {
      if (!isAdmin) return;
      try {
        const res = await getSummary();
        setData(res.data);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load admin summary");
      }
    })();
  }, [isAdmin]);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="h2">Admin Dashboard</div>
        <div className="p">Overview of sessions and recent activity.</div>

        {!isAdmin && (
          <div className="card" style={{ marginTop: 12 }}>
            <b>Admin only</b>
            <div className="p">Login as admin to view this dashboard.</div>
          </div>
        )}

        {err ? <div className="alert">{err}</div> : null}

        {isAdmin && data && (
          <>
            <div className="grid" style={{ marginTop: 12 }}>
              <div className="card">
                <div className="badge">Today</div>
                <div className="h1" style={{ marginTop: 10 }}>{data.todayCount}</div>
              </div>
              <div className="card">
                <div className="badge">Upcoming</div>
                <div className="h1" style={{ marginTop: 10 }}>{data.upcomingCount}</div>
              </div>
              <div className="card">
                <div className="badge">Cancelled</div>
                <div className="h1" style={{ marginTop: 10 }}>{data.cancelledCount}</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <b>Recent Sessions</b>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {(data.recent || []).map((s) => (
                  <div key={s._id} className="row" style={{ justifyContent: "space-between" }}>
                    <span>
                      <b>{s.client?.name || "Client"}</b> → {s.therapist?.name || "Therapist"}
                    </span>
                    <span className="badge">{new Date(s.start).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
