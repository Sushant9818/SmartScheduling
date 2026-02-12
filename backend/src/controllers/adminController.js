import bcrypt from "bcrypt";
import Client from "../models/Client.js";
import Therapist from "../models/Therapist.js";
import User from "../models/User.js";
import Session from "../models/Session.js";

/**
 * GET /api/admin/stats/overview
 * Returns: totalUsers, totalTherapists, upcomingSessions, cancelRate
 */
export async function getStatsOverview(req, res) {
  try {
    const [totalUsers, totalTherapists, upcomingSessions, totalSessions, cancelledSessions] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "therapist" }),
        Session.countDocuments({ status: "scheduled", start: { $gte: new Date() } }),
        Session.countDocuments(),
        Session.countDocuments({ status: "cancelled" }),
      ]);

    const cancelRate = totalSessions > 0 ? cancelledSessions / totalSessions : 0;

    return res.json({
      totalUsers,
      totalTherapists,
      upcomingSessions,
      cancelRate,
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to load stats" });
  }
}

/**
 * GET /api/admin/stats/sessions-per-week?weeks=8
 * Returns: [{ week: "2025-W05", sessions: 12 }, ...]
 */
export async function getSessionsPerWeek(req, res) {
  try {
    const weeks = Math.min(52, Math.max(1, parseInt(req.query.weeks, 10) || 8));
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - weeks * 7);
    start.setHours(0, 0, 0, 0);

    const sessions = await Session.aggregate([
      { $match: { start: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: "$start" },
            week: { $week: "$start" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    const data = sessions.map((s) => ({
      week: `${s._id.year}-W${String(s._id.week).padStart(2, "0")}`,
      sessions: s.count,
    }));

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to load sessions per week" });
  }
}

/**
 * Admin deletes a client profile.
 * Params:
 *  - id = Client._id
 * Query:
 *  - deleteUser=true  (optional: also delete linked User)
 *  - cancelSessions=true (default true): cancel future scheduled sessions
 */
export async function deleteClientProfile(req, res) {
  try {
    const { id } = req.params;
    const deleteUser = String(req.query.deleteUser || "false") === "true";
    const cancelSessions = String(req.query.cancelSessions || "true") === "true";

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    // Cancel sessions to keep history (recommended)
    if (cancelSessions) {
      await Session.updateMany(
        { client: client._id, status: "scheduled" },
        { $set: { status: "cancelled" } }
      );
    }

    // Unlink user -> client
    const user = await User.findOne({ client: client._id });

    if (user) {
      user.client = null;
      await user.save();

      if (deleteUser) {
        await User.deleteOne({ _id: user._id });
      }
    }

    await Client.deleteOne({ _id: client._id });

    return res.json({
      message: "Client profile deleted",
      deletedClientId: String(client._id),
      userDeleted: !!(user && deleteUser),
      sessionsCancelled: cancelSessions
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to delete client" });
  }
}

/**
 * Admin deletes a therapist profile.
 * Params:
 *  - id = Therapist._id
 * Query:
 *  - deleteUser=true (optional)
 *  - cancelSessions=true (default true)
 */
export async function deleteTherapistProfile(req, res) {
  try {
    const { id } = req.params;
    const deleteUser = String(req.query.deleteUser || "false") === "true";
    const cancelSessions = String(req.query.cancelSessions || "true") === "true";

    const therapist = await Therapist.findById(id);
    if (!therapist) return res.status(404).json({ message: "Therapist not found" });

    // Cancel sessions to keep history (recommended)
    if (cancelSessions) {
      await Session.updateMany(
        { therapist: therapist._id, status: "scheduled" },
        { $set: { status: "cancelled" } }
      );
    }

    // Unlink user -> therapist
    const user =
      (therapist.user ? await User.findById(therapist.user) : null) ||
      (await User.findOne({ therapist: therapist._id }));

    if (user) {
      user.therapist = null;
      await user.save();

      if (deleteUser) {
        await User.deleteOne({ _id: user._id });
      }
    }

    await Therapist.deleteOne({ _id: therapist._id });

    return res.json({
      message: "Therapist profile deleted",
      deletedTherapistId: String(therapist._id),
      userDeleted: !!(user && deleteUser),
      sessionsCancelled: cancelSessions
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to delete therapist" });
  }
}

/**
 * Admin: create therapist + linked user (role=therapist).
 * Body: { name, email, password, specialties? }
 */
export async function createTherapistWithUser(req, res) {
  try {
    const { name, email, password, specialties } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: "Email already used" });
    }
    const therapistWithEmail = await Therapist.findOne({ email: normalizedEmail });
    if (therapistWithEmail) {
      return res.status(409).json({ message: "Therapist with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "therapist",
    });

    const therapist = await Therapist.create({
      user: user._id,
      email: normalizedEmail,
      name: name.trim(),
      specialties: Array.isArray(specialties) ? specialties : [],
    });

    user.therapist = therapist._id;
    await user.save();

    const populated = await Therapist.findById(therapist._id).populate("user", "name email");
    return res.status(201).json(populated);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to create therapist" });
  }
}

/**
 * Admin: update therapist. Body: { name?, email?, specialties?, weeklyAvailability? }
 */
export async function updateTherapist(req, res) {
  try {
    const { id } = req.params;
    const { name, email, specialties, weeklyAvailability } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (email !== undefined) update.email = String(email).toLowerCase().trim();
    if (specialties !== undefined) update.specialties = Array.isArray(specialties) ? specialties : [];
    if (weeklyAvailability !== undefined) update.weeklyAvailability = weeklyAvailability;

    const therapist = await Therapist.findByIdAndUpdate(id, update, { new: true });
    if (!therapist) return res.status(404).json({ message: "Therapist not found" });
    return res.json(therapist);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to update therapist" });
  }
}

/**
 * Admin: update client. Body: { name?, email?, preferences? }
 */
export async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const { name, email, preferences } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (email !== undefined) update.email = String(email).toLowerCase().trim();
    if (preferences !== undefined) update.preferences = preferences;

    const client = await Client.findByIdAndUpdate(id, update, { new: true });
    if (!client) return res.status(404).json({ message: "Client not found" });
    return res.json(client);
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to update client" });
  }
}


