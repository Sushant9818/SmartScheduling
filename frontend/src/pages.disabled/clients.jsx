import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import SlotCard from "../components/SlotCard";
import { createClient, listClients } from "../services/clientAPI";
import { useAuth } from "../context/AuthContext";

function toMinutes(hhmm) {
  const [h, m] = (hhmm || "").split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function getApiMessage(err, fallback) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message || err?.message || fallback;

  if (status === 401) return "Unauthorized (401). Please login.";
  if (status === 403) return "Forbidden (403). You don't have permission for this action.";
  return msg;
}

export default function ClientsPage() {
  const { user } = useAuth();

  // You can tune this rule:
  // - admin can create any client
  // - client can create (self) client record (demo)
  const canCreateClients = !!user && (user.role === "admin" || user.role === "client");

  const [clients, setClients] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    preferredDaysOfWeek: "1,3,5",
    startTime: "18:00",
    endTime: "21:00"
  });

  const load = async () => {
    setError("");
    setLoadingList(true);
    try {
      const res = await listClients();
      setClients(res.data || []);
    } catch (e) {
      setError(getApiMessage(e, "Failed to load clients"));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!canCreateClients) {
      setError("Read-only mode: login as admin/client to create clients.");
      return;
    }

    const startMin = toMinutes(form.startTime);
    const endMin = toMinutes(form.endTime);
    if (startMin === null || endMin === null) return alert("Use HH:MM format (e.g., 18:00)");
    if (endMin <= startMin) return alert("endTime must be after startTime");

    const preferredDaysOfWeek = form.preferredDaysOfWeek
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !Number.isNaN(n))
      .filter((n) => n >= 0 && n <= 6);

    setError("");
    setSaving(true);
    try {
      await createClient({
        name: form.name.trim(),
        email: form.email?.trim(),
        preferences: {
          preferredDaysOfWeek,
          preferredTimeRanges: [{ startTime: form.startTime, endTime: form.endTime }]
        }
      });

      setForm((p) => ({ ...p, name: "", email: "" }));
      await load();
      alert("✅ Client created");
    } catch (e2) {
      setError(getApiMessage(e2, "Create client failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="h2">Clients</div>
            <div className="p">
              {user ? (
                <>
                  Logged in as <span className="badge">{user.email}</span>{" "}
                  <span className="badge">{user.role}</span>
                </>
              ) : (
                "Not logged in (read-only)."
              )}
            </div>
          </div>

          <div className="row">
            <button className="btn secondary" onClick={load} disabled={loadingList}>
              {loadingList ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert">
            <b>Error:</b> {error}
          </div>
        ) : null}

        {!canCreateClients ? (
          <div className="card" style={{ marginTop: 12 }}>
            <b>Read-only mode</b>
            <div className="p">
              Login as <b>admin</b> or <b>client</b> to create client profiles.
            </div>
          </div>
        ) : null}

        {/* Create client */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="h2" style={{ fontSize: 16 }}>Create Client</div>
          <div className="p">Set preferred days (0-6) and time window for better matching.</div>

          <form onSubmit={onSubmit} style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}>
            <input
              placeholder="Client name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              disabled={!canCreateClients || saving}
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!canCreateClients || saving}
            />

            <div className="row">
              <input
                placeholder="Preferred days (0-6) e.g. 1,3,5"
                value={form.preferredDaysOfWeek}
                onChange={(e) => setForm({ ...form, preferredDaysOfWeek: e.target.value })}
                disabled={!canCreateClients || saving}
                style={{ maxWidth: 260 }}
              />
              <input
                placeholder="Start (HH:MM)"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                disabled={!canCreateClients || saving}
                style={{ maxWidth: 160 }}
              />
              <input
                placeholder="End (HH:MM)"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                disabled={!canCreateClients || saving}
                style={{ maxWidth: 160 }}
              />
            </div>

            <button className="btn" type="submit" disabled={!canCreateClients || saving}>
              {saving ? "Saving..." : "Create Client"}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
          <div className="h2" style={{ fontSize: 16 }}>All Clients</div>
          <span className="badge">{clients.length} total</span>
        </div>

        {loadingList ? (
          <div className="p" style={{ marginTop: 10 }}>Loading clients...</div>
        ) : (
          <div className="grid" style={{ marginTop: 10 }}>
            {clients.map((c) => {
              const days = (c.preferences?.preferredDaysOfWeek || []).join(",") || "-";
              const tr = c.preferences?.preferredTimeRanges?.[0];
              const time = tr ? `${tr.startTime}-${tr.endTime}` : "-";

              return (
                <SlotCard
                  key={c._id}
                  title={c.name}
                  subtitle={`Email: ${c.email || "-"} | Days: ${days} | Time: ${time}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}


  