import { useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const user = await login(email, password);

      // ✅ redirect by role
      if (user?.role === "admin") router.push("/admin");
      else if (user?.role === "therapist") router.push("/therapists");
      else router.push("/book");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="h2">Login</div>
          <div className="p">Sign in to manage schedules and book sessions.</div>

          {err ? <div className="alert">{err}</div> : null}

          <form onSubmit={onSubmit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>

            <div className="row" style={{ justifyContent: "space-between" }}>
              <Link href="/forgot-password" style={{ fontSize: 14 }}>
                Forgot password?
              </Link>

              <Link href="/register" style={{ fontSize: 14 }}>
                Create account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
