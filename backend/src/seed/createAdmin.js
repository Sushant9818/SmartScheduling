/**
 * DEV-ONLY: Create the first Admin user if none exists.
 * Run manually: node src/seed/createAdmin.js (from backend directory)
 * Does NOT run on server start. Do not use in production to create admins.
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend root so MONGO_URI is available
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ADMIN_EMAIL = "admin@smart.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_NAME = "Super Admin";
const BCRYPT_ROUNDS = 10;

async function createAdmin() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri || String(mongoUri).trim() === "") {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }

  try {
    const existingAdmin = await User.findOne({ role: "admin" }).lean();
    if (existingAdmin) {
      console.log("⚠️  Admin already exists");
      console.log(`   Email: ${existingAdmin.email}`);
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
    });

    console.log("✅ Admin created");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }

  process.exit(0);
}

createAdmin();
