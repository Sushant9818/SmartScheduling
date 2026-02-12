import Navbar from "../components/Navbar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div style={{ padding: 16 }}>
        <h1>Smart Scheduling System</h1>
        <ol>
          <li>Go to <b>Therapists</b> → create therapist → add availability</li>
          <li>Go to <b>Clients</b> → create client → set preferred days/times</li>
          <li>Go to <b>Book Session</b> → click “Suggest Slots” → click suggested slot to book</li>
        </ol>
      </div>
    </>
  );
}

