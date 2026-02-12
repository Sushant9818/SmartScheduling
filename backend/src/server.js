// Load .env FIRST before any other imports that might use env vars
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { Server } from "socket.io";

// Port: set in backend/.env (e.g. PORT=5001). Fallback used if .env not loaded.
const PORT = Number(process.env.PORT) || 5001;

// Validate required env vars AFTER dotenv.config() has run
if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim() === "") {
  throw new Error("JWT_SECRET must be set in backend/.env");
}
if (!process.env.REFRESH_TOKEN_SECRET || String(process.env.REFRESH_TOKEN_SECRET).trim() === "") {
  throw new Error("REFRESH_TOKEN_SECRET must be set in backend/.env");
}
if (process.env.JWT_SECRET === process.env.REFRESH_TOKEN_SECRET) {
  throw new Error("JWT_SECRET and REFRESH_TOKEN_SECRET must be different values");
}

async function startServer() {
  await connectDB();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*" } // for dev; lock down later
  });

  // make io available in controllers: req.app.get("io")
  app.set("io", io);

  io.on("connection", (socket) => {
    // Optional: join rooms by role / therapistId / clientId
    // socket.join("global");
    socket.on("disconnect", () => {});
  });

  server.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

startServer();

