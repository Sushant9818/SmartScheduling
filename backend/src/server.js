// Load backend/.env for local dev only (file must not be committed; Render uses Dashboard env)
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../.env") });
}

import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { validateRequiredEnv } from "./config/env.js";
import { getSocketCorsOptions } from "./config/cors.js";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT) || 5000;

validateRequiredEnv();

async function startServer() {
  await connectDB();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: getSocketCorsOptions(),
  });

  // make io available in controllers: req.app.get("io")
  app.set("io", io);
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});
  io.on("connection", (socket) => {
    // Optional: join rooms by role / therapistId / clientId
    // socket.join("global");
    socket.on("disconnect", () => {});
  });
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`API listening on port ${PORT}`);
  });
}

startServer();

