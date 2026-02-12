import { useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const res = await api.post("/password/forgot", { email });
    setMsg(res.data.message);
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="h2">Forgot Password</div>
          <div className="p">We’ll email a reset link.</div>
          <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn">Send reset link</button>
          </form>
          {msg ? <div className="p" style={{ marginTop: 12 }}>{msg}</div> : null}
        </div>
      </div>
    </>
  );
}
