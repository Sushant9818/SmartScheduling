import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const linkStyle = (path) => ({
    padding: "8px 10px",
    borderRadius: 10,
    textDecoration: "none",
    color: "#111",
    ...(router.pathname === path ? { background: "#f3f4f6", fontWeight: 600 } : {})
  });

  const NavLinks = ({ onClick }) => (
    <>
      <Link href="/" style={linkStyle("/")} onClick={onClick}>Home</Link>
      <Link href="/book" style={linkStyle("/book")} onClick={onClick}>Book</Link>

      {user && (
        <>
          <Link href="/clients" style={linkStyle("/clients")} onClick={onClick}>Clients</Link>
          <Link href="/therapists" style={linkStyle("/therapists")} onClick={onClick}>Therapists</Link>
          <Link href="/sessions" style={linkStyle("/sessions")} onClick={onClick}>Sessions</Link>
        </>
      )}

      {user?.role === "admin" && (
        <>
          <Link href="/admin" style={linkStyle("/admin")} onClick={onClick}>Admin</Link>
          <Link href="/admin/users" style={linkStyle("/admin/users")} onClick={onClick}>Users</Link>
        </>
      )}
    </>
  );

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#fff",
        borderBottom: "1px solid #e5e7eb"
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ fontWeight: 800, textDecoration: "none", color: "#111" }}>
            Smart Scheduling
          </Link>
        </div>

        {/* Desktop links */}
        <nav style={{ display: "flex", gap: 6, alignItems: "center" }} className="nav-desktop">
          <NavLinks />
        </nav>

        {/* Right actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {loading ? null : user ? (
            <>
              <span style={{ fontSize: 13, color: "#555", whiteSpace: "nowrap" }}>
                {user.email} ({user.role})
              </span>

              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/login")}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                Login
              </button>

              <button
                onClick={() => router.push("/register")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Register
              </button>
            </>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: "pointer",
              display: "none"
            }}
            className="nav-mobile-btn"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ borderTop: "1px solid #e5e7eb", background: "#fff" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: 12, display: "grid", gap: 6 }}>
            <NavLinks onClick={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Minimal responsive CSS */}
      <style jsx>{`
        @media (max-width: 820px) {
          .nav-desktop {
            display: none !important;
          }
          .nav-mobile-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </header>
  );
}





