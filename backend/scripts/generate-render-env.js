#!/usr/bin/env node
/**
 * Creates backend/render.env with generated JWT secrets.
 * You only need to edit MONGO_URI (MongoDB Atlas), then upload to Render.
 *
 * Usage: npm run setup:render-env
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "render.env");

const jwt = crypto.randomBytes(48).toString("base64url");
const refresh = crypto.randomBytes(48).toString("base64url");

const content = `# Generated ${new Date().toISOString()}
# 1) Replace MONGO_URI below with your MongoDB Atlas connection string
# 2) Render Dashboard → your service → Environment → "Add from .env" → upload this file
# 3) Save, rebuild, and deploy
# Do NOT commit this file (gitignored)

NODE_ENV=production
FRONTEND_URL=https://smart-scheduling-eta.vercel.app

MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.YOUR_CLUSTER.mongodb.net/smart-scheduling?retryWrites=true&w=majority

JWT_SECRET=${jwt}
REFRESH_TOKEN_SECRET=${refresh}

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=Smart Scheduling <noreply@example.com>
`;

fs.writeFileSync(outPath, content, "utf8");
console.log("Created:", outPath);
console.log("");
console.log("Next steps:");
console.log("  1. Open render.env and set MONGO_URI (Atlas mongodb+srv://...)");
console.log("  2. Render → Environment → Add from .env → select render.env");
console.log("  3. Save, rebuild, and deploy");
console.log("");
console.log("JWT secrets were generated automatically.");
