import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getCorsOptions } from "./config/cors.js";

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

const corsOptions = getCorsOptions();
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ✅ cookieParser MUST be before routes (so req.cookies is populated)
app.use(cookieParser());
app.use(express.json());

// Health + root (used by Render healthCheckPath and frontend status badge)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Smart Scheduling API is running",
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Smart Scheduling API is running",
  });
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


