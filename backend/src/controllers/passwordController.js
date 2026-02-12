import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { sendEmail } from "../utils/mailer.js"; // optional

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase().trim() });

  // Always return OK to avoid leaking emails
  if (!user) return res.json({ message: "If that email exists, reset instructions were sent." });

  const token = crypto.randomBytes(32).toString("hex");
  user.resetTokenHash = hashToken(token);
  user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Reset link (valid 30 mins): ${resetLink}`
    });
  } catch {
    // don't crash
  }

  res.json({ message: "If that email exists, reset instructions were sent." });
}

export async function resetPassword(req, res) {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) return res.status(400).json({ message: "Missing fields" });
  if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.resetTokenHash) return res.status(400).json({ message: "Invalid or expired token" });
  if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const tokenHash = hashToken(token);
  if (tokenHash !== user.resetTokenHash) return res.status(400).json({ message: "Invalid or expired token" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  await user.save();

  res.json({ message: "Password updated successfully" });
}

/**
 * POST /api/password/change (requireAuth)
 * Body: { currentPassword, newPassword }
 * Finds user by req.user.sub, verifies currentPassword, then hashes and saves newPassword.
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  const userId = req.user?.sub ?? req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await User.findById(userId).select("passwordHash");
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password changed successfully" });
}
