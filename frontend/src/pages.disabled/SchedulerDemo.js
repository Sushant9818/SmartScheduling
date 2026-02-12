import { useEffect, useState } from "react";
import { listClients } from "../services/clientAPI";
import { listTherapists } from "../services/therapistAPI";
import { suggestSlots } from "../services/schedulingAPI";
import { bookSession } from "../services/sessionAPI";

export default function SchedulerDemo() {
  const [clients, setClients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [clientId, setClientId] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [from, setFrom] = useState("2025-12-13T00:00:00.000Z");
  const [to, setTo] = useState("2025-12-27T00:00:00.000Z");
  const [rankedSlots, setRankedSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [cRes, tRes] = await Promise.all([listClients(), listTherapists()]);
      setClients(cRes.data);
      setTherapists(tRes.data);
      if (cRes.data[0]) setClientId(cRes.data[0]._id);
      if (tRes.data[0]) setTherapistId(tRes.data[0]._id);
    })();
  }, []);

  const onSuggest = async () => {
    setLoading(true);
    try {
      const res = await suggestSlots({ clientId, therapistId, from, to, sessionMinutes: 60 });
      setRankedSlots(res.data.rankedSlots || []);
    } finally {
      setLoading(false);
    }
  };

  const onBook = async (slot) => {
    await bookSession({
      therapistId,
      clientId,
      start: slot.start,
      end: slot.end
    });
    alert("Booked!");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Smart Scheduler Demo</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
          {therapists.map((t) => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
        </select>

        <button onClick={onSuggest} disabled={loading || !clientId || !therapistId}>
          {loading ? "Finding..." : "Suggest Slots"}
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Top Suggestions</h3>
        {rankedSlots.length === 0 ? (
          <p>No suggestions yet.</p>
        ) : (
          <ul>
            {rankedSlots.slice(0, 10).map((s, idx) => (
              <li key={idx} style={{ marginBottom: 10 }}>
                <div>
                  <b>{new Date(s.start).toLocaleString()}</b> → {new Date(s.end).toLocaleString()}
                  {"  "} (score: {s.score?.toFixed?.(2) ?? s.score})
                </div>
                <button onClick={() => onBook(s)}>Book</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
