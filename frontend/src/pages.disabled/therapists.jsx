import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import SlotCard from "../components/SlotCard";
import { createTherapist, listTherapists, setAvailability } from "../services/therapistAPI";
import { useAuth } from "../context/AuthContext";

const dayLabel = (d) =>
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][Number(d)] ?? `Day ${d}`;

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

export default function TherapistsPage() {
  const { user } = useAuth();
  const canManageTherapists = !!user && (user.role === "admin" || user.role === "therapist");

  const [therapists, setTherapists] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    specialties: "Anxiety,Depression",
    dayOfWeek: 1,
    startTime: "18:00",
    endTime: "21:00"
  });

  const load = async () => {
    setError("");
    setLoadingList(true);
    try {
      const res = await listTherapists();
      setTherapists(res.data || []);
    } catch (e) {
      setError(getApiMessage(e, "Failed to load therapists"));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();

    if (!canManageTherapists) {
      setError("Read-only mode: login as admin/therapist to create therapists.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const specialties = form.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createTherapist({ name: form.name.trim(), specialties });

      setForm((p) => ({ ...p, name: "" }));
      await load();
      alert("✅ Therapist created");
    } catch (e2) {
      setError(getApiMessage(e2, "Create therapist failed"));
    } finally {
      setSaving(false);
    }
  };

  const onAddAvailability = async (therapistId) => {
    if (!canManageTherapists) {
      setError("Read-only mode: login as admin/therapist to manage availability.");
      return;
    }

    const startMin = toMinutes(form.startTime);
    const endMin = toMinutes(form.endTime);

    if (startMin === null || endMin === null) return alert("Use HH:MM format (e.g., 18:00)");
    if (endMin <= startMin) return alert("endTime must be after startTime");

    setError("");
    setSaving(true);
    try {
      const t = therapists.find((x) => x._id === therapistId);
      const current = t?.weeklyAvailability || [];

      const next = [
        ...current,
        {
          dayOfWeek: Number(form.dayOfWeek),
          startTime: form.startTime,
          endTime: form.endTime
        }
      ];

      await setAvailability(therapistId, next);
      await load();
      alert("✅ Availability added");
    } catch (e2) {
      setError(getApiMessage(e2, "Add availability failed"));
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
            <div className="h2">Therapists</div>
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

        {error ? <div className="alert"><b>Error:</b> {error}</div> : null}

        {!canManageTherapists ? (
          <div className="card" style={{ marginTop: 12 }}>
            <b>Read-only mode</b>
            <div className="p">
              Login as <b>admin</b> or <b>therapist</b> to create therapists and set availability.
            </div>
          </div>
        ) : null}

        {/* Create therapist */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="h2" style={{ fontSize: 16 }}>Create Therapist</div>
          <div className="p">Only admin/therapist can create.</div>

          <form onSubmit={onCreate} style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}>
            <input
              placeholder="Therapist name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              disabled={!canManageTherapists || saving}
            />
            <input
              placeholder="Specialties (comma separated)"
              value={form.specialties}
              onChange={(e) => setForm({ ...form, specialties: e.target.value })}
              disabled={!canManageTherapists || saving}
            />
            <button className="btn" type="submit" disabled={!canManageTherapists || saving}>
              {saving ? "Saving..." : "Create Therapist"}
            </button>
          </form>
        </div>

        {/* Availability builder */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="h2" style={{ fontSize: 16 }}>Add Availability Block</div>
          <div className="p">Pick day/time, then click “Add availability block” on any therapist card.</div>

          <div className="row" style={{ marginTop: 12 }}>
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
              disabled={!canManageTherapists || saving}
              style={{ maxWidth: 220 }}
            >
              <option value={0}>Sun (0)</option>
              <option value={1}>Mon (1)</option>
              <option value={2}>Tue (2)</option>
              <option value={3}>Wed (3)</option>
              <option value={4}>Thu (4)</option>
              <option value={5}>Fri (5)</option>
              <option value={6}>Sat (6)</option>
            </select>

            <input
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              disabled={!canManageTherapists || saving}
              style={{ maxWidth: 160 }}
            />
            <input
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              disabled={!canManageTherapists || saving}
              style={{ maxWidth: 160 }}
            />
          </div>
        </div>

        {/* List */}
        <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
          <div className="h2" style={{ fontSize: 16 }}>All Therapists</div>
          <span className="badge">{therapists.length} total</span>
        </div>

        {loadingList ? (
          <div className="p" style={{ marginTop: 10 }}>Loading therapists...</div>
        ) : (
          <div className="grid" style={{ marginTop: 10 }}>
            {therapists.map((t) => (
              <div key={t._id}>
                <SlotCard
                  title={t.name}
                  subtitle={`Specialties: ${(t.specialties || []).join(", ") || "-"} | Availability: ${
                    (t.weeklyAvailability || []).length
                  } blocks`}
                  onClick={canManageTherapists ? () => onAddAvailability(t._id) : undefined}
                  buttonText={canManageTherapists ? "Add availability block" : "Read only"}
                />

                <div className="p" style={{ marginTop: 8 }}>
                  {(t.weeklyAvailability || []).length === 0 ? (
                    <span>No weekly availability yet.</span>
                  ) : (
                    <>
                      <b>Blocks:</b>
                      <div style={{ marginTop: 6 }}>
                        {(t.weeklyAvailability || []).map((b, i) => (
                          <div key={i}>
                            {dayLabel(b.dayOfWeek)}: {b.startTime} - {b.endTime}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
