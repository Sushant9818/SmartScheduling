import Link from "next/link";

export default function Breadcrumbs({ items = [] }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 14, color: "#555" }}>
      <Link href="/" style={{ color: "#111", textDecoration: "none" }}>Home</Link>
      {items.map((it, idx) => (
        <span key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.6 }}>/</span>
          {it.href ? (
            <Link href={it.href} style={{ color: "#111", textDecoration: "none" }}>{it.label}</Link>
          ) : (
            <span style={{ color: "#111", fontWeight: 600 }}>{it.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
