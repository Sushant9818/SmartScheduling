import bcrypt from "bcrypt";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Therapist from "../models/Therapist.js";
import Session from "../models/Session.js";

const ALLOWED_ROLES = ["admin", "therapist", "client"];
const BCRYPT_ROUNDS = 10;

/**
 * GET /api/admin/users?role=&q=
 * List users with optional filters: role (admin|therapist|client), q (search name/email).
 */
export async function getUsers(req, res) {
  try {
    const { role, q } = req.query;
    const filter = {};

    if (role && ALLOWED_ROLES.includes(String(role).toLowerCase())) {
      filter.role = String(role).toLowerCase();
    }

    if (q && String(q).trim()) {
      const search = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(filter)
      .select("-passwordHash -refreshTokenHash -resetTokenHash -resetTokenExpiresAt")
      .sort({ createdAt: -1 })
      .lean();

    const list = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      client: u.client ? String(u.client) : null,
      therapist: u.therapist ? String(u.therapist) : null,
    }));

    return res.json(list);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to load users" });
  }
}

/**
 * POST /api/admin/users
 * Body: { name, email, password, role }
 * role: admin | therapist | client
 * Auto-creates Client/Therapist and links when role is client/therapist.
 */
export async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const rawRole = (role || "client").toString().toLowerCase();
    if (!ALLOWED_ROLES.includes(rawRole)) {
      return res.status(400).json({ message: "role must be admin, therapist, or client" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already used" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: rawRole,
    });

    if (rawRole === "client") {
      const client = await Client.create({
        name: user.name,
        email: user.email,
        preferences: {
          preferredDaysOfWeek: [1, 3, 5],
          preferredTimeRanges: [{ startTime: "18:00", endTime: "21:00" }],
        },
      });
      user.client = client._id;
      await user.save();
    }

    if (rawRole === "therapist") {
      const therapist = await Therapist.create({
        user: user._id,
        email: user.email,
        name: user.name,
        specialties: [],
        weeklyAvailability: [],
      });
      user.therapist = therapist._id;
      await user.save();
    }

    const populated = await User.findById(user._id)
      .select("-passwordHash -refreshTokenHash -resetTokenHash -resetTokenExpiresAt")
      .lean();

    return res.status(201).json({
      id: String(populated._id),
      name: populated.name,
      email: populated.email,
      role: populated.role,
      createdAt: populated.createdAt,
      client: populated.client ? String(populated.client) : null,
      therapist: populated.therapist ? String(populated.therapist) : null,
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: "Email already used" });
    }
    return res.status(500).json({ message: e?.message || "Failed to create user" });
  }
}

/**
 * PATCH /api/admin/users/:id
 * Body: { name?, email?, role? }
 * If role changes to client/therapist, ensure linked profile exists (create if missing).
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name !== undefined) user.name = String(name).trim();
    if (email !== undefined) {
      const normalized = String(email).toLowerCase().trim();
      const existing = await User.findOne({ email: normalized, _id: { $ne: id } });
      if (existing) return res.status(409).json({ message: "Email already used" });
      user.email = normalized;
    }

    const newRole = role !== undefined ? String(role).toLowerCase() : user.role;
    if (role !== undefined && !ALLOWED_ROLES.includes(newRole)) {
      return res.status(400).json({ message: "role must be admin, therapist, or client" });
    }

    const previousRole = user.role;
    if (newRole !== previousRole) {
      if (previousRole === "client" && user.client) {
        await Client.deleteOne({ _id: user.client });
        user.client = undefined;
      }
      if (previousRole === "therapist" && user.therapist) {
        await Therapist.deleteOne({ _id: user.therapist });
        user.therapist = undefined;
      }

      if (newRole === "client") {
        const client = await Client.create({
          name: user.name,
          email: user.email,
          preferences: {
            preferredDaysOfWeek: [1, 3, 5],
            preferredTimeRanges: [{ startTime: "18:00", endTime: "21:00" }],
          },
        });
        user.client = client._id;
      }
      if (newRole === "therapist") {
        const therapist = await Therapist.create({
          user: user._id,
          email: user.email,
          name: user.name,
          specialties: [],
          weeklyAvailability: [],
        });
        user.therapist = therapist._id;
      }
      user.role = newRole;
    }

    await user.save();

    const out = await User.findById(user._id)
      .select("-passwordHash -refreshTokenHash -resetTokenHash -resetTokenExpiresAt")
      .lean();

    return res.json({
      id: String(out._id),
      name: out.name,
      email: out.email,
      role: out.role,
      createdAt: out.createdAt,
      client: out.client ? String(out.client) : null,
      therapist: out.therapist ? String(out.therapist) : null,
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: "Email already used" });
    }
    return res.status(500).json({ message: e?.message || "Failed to update user" });
  }
}

/**
 * DELETE /api/admin/users/:id
 * Query: deleteProfile=true to also delete linked Client/Therapist.
 * Cancels future sessions for that client/therapist when profile is deleted.
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const deleteProfile = String(req.query.deleteProfile || "true") === "true";

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "client" && user.client) {
      if (deleteProfile) {
        await Session.updateMany(
          { client: user.client, status: "scheduled" },
          { $set: { status: "cancelled" } }
        );
        await Client.deleteOne({ _id: user.client });
      }
    }

    if (user.role === "therapist" && user.therapist) {
      if (deleteProfile) {
        await Session.updateMany(
          { therapist: user.therapist, status: "scheduled" },
          { $set: { status: "cancelled" } }
        );
        await Therapist.deleteOne({ _id: user.therapist });
      }
    }

    await User.deleteOne({ _id: id });

    return res.json({ message: "Deleted" });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to delete user" });
  }
}
