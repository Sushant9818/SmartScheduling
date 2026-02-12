import { useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import { registerUser } from "../services/authAPI";

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "client"
  });

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) return setErr("Name is required");
    if (!emailOk(email)) return setErr("Please enter a valid email");
    if (!form.password || form.password.length < 6) return setErr("Password must be at least 6 characters");
    if (form.password !== form.confirmPassword) return setErr("Passwords do not match");

    setSaving(true);
    try {
      await registerUser({
        name,
        email,
        password: form.password,
        role: form.role
      });

      alert("✅ Registered. Now login.");
      router.push("/login");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Register failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="h2">Register</div>
          <div className="p">Create a user account to book sessions and manage schedules.</div>

          {err ? <div className="alert">{err}</div> : null}

          <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <input
                placeholder="Password (min 6 chars)"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />

              <input
                placeholder="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />

              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="client">client</option>
                <option value="therapist">therapist</option>

                {/* Recommended: don’t allow public admin signup */}
                {/* <option value="admin">admin</option> */}
              </select>

              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Creating..." : "Register"}
              </button>

              <button className="btn secondary" type="button" onClick={() => router.push("/login")} disabled={saving}>
                Back to login
              </button>
            </div>
          </form>

          <div className="p" style={{ marginTop: 12 }}>
            Tip: Choose <b>therapist</b> if you want to manage availability blocks. Choose <b>client</b> to book sessions.
          </div>
        </div>
      </div>
    </>
  );
}
