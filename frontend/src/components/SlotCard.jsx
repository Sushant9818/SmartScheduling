export default function SlotCard({ title, subtitle, onClick, buttonText = "Select" }) {
    return (
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "white" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>{subtitle}</div>
        {onClick && (
          <button style={{ marginTop: 10 }} onClick={onClick}>
            {buttonText}
          </button>
        )}
      </div>
    );
  }
  