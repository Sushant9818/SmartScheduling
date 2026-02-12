import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import therapistRoutes from "./routes/therapistRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import schedulingRoutes from "./routes/schedulingRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import uiRoutes from "./routes/uiRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

const app = express();

// CORS (local dev): must be EXACT origin + credentials true for cookies.
// IMPORTANT: Do NOT use "*" when credentials: true
//
// Refresh-cookie verification checklist (browser):
// 1) After login: in Network tab check response has Set-Cookie header for refreshToken.
// 2) DevTools → Application → Cookies → http://localhost:5001 → refreshToken should exist.
// 3) POST /api/auth/refresh: Request Headers should include Cookie: refreshToken=...
// 4) After access token expiry: protected route returns 401 TOKEN_EXPIRED → http.ts refresh + retry → request succeeds.
const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ Preflight support - must also allow credentials with same options
app.options("*", cors(corsOptions));

// ✅ cookieParser MUST be before routes (so req.cookies is populated)
app.use(cookieParser());
app.use(express.json());

// ✅ health (GET /api/health returns { status: "ok" })
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ root
app.get("/", (req, res) => {
  res.json({ message: "Smart Scheduling API running 🚀" });
});

// ✅ routes
app.use("/api/auth", authRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/ui", uiRoutes);

app.use("/api/therapists", therapistRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/scheduling", schedulingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

// ✅ 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;


