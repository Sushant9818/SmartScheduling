import { useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { registerAdminUser } from "../../services/authAPI";
import { useRouter } from "next/router";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      await registerAdminUser(form);
      alert("✅ Admin user created");
      setForm({ name: "", email: "", password: "", role: "admin" });
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="h2">Admin: Create Users</div>
        <div className="p">Create admin accounts (admin-only endpoint).</div>

        {!isAdmin && (
          <div className="card" style={{ marginTop: 12 }}>
            <b>Admin only</b>
            <div className="p">Login as admin to access this page.</div>
          </div>
        )}

        {err ? <div className="alert">{err}</div> : null}

        {isAdmin && (
          <div className="card" style={{ marginTop: 12, maxWidth: 520 }}>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">admin</option>
              </select>

              <button className="btn" disabled={saving}>
                {saving ? "Creating..." : "Create Admin"}
              </button>

              <button className="btn secondary" type="button" onClick={() => router.push("/admin")}>
                Back to Admin Dashboard
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
