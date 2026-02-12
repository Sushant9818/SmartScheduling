import { useRouter } from "next/router";
import { useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../services/api";

export default function ResetPassword() {
  const router = useRouter();
  const { token, email } = router.query;

  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const res = await api.post("/password/reset", { token, email, newPassword: pw });
      setMsg(res.data.message);
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Reset failed");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="h2">Reset Password</div>
          <div className="p">Enter your new password.</div>
          {err ? <div className="alert">{err}</div> : null}
          {msg ? <div className="p" style={{ marginTop: 12 }}>{msg}</div> : null}

          <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button className="btn">Update password</button>
          </form>
        </div>
      </div>
    </>
  );
}
