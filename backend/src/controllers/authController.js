import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import Client from "../models/Client.js";
import Therapist from "../models/Therapist.js";

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || (process.env.NODE_ENV === "production" ? "15m" : "7d");
const REFRESH_DAYS = 7;
const REFRESH_TOKEN_TTL = `${REFRESH_DAYS}d`;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Access token payload: sub = userId (used by requireAuth). Same JWT_SECRET as middleware. TTL from ACCESS_TOKEN_TTL (default 7d dev, 15m prod). */
function signAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set");
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      clientId: user.client ? user.client.toString() : null,
      therapistId: user.therapist ? user.therapist.toString() : null
    },
    secret,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

// Cookie path for local dev:
// Use "/" so the browser always sends the refreshToken cookie back to this backend
// (including /api/auth/refresh). This also makes it easier to see in DevTools.
const REFRESH_COOKIE_PATH = "/";

/** Refresh token payload: sub=userId. Signed by REFRESH_TOKEN_SECRET, longer TTL. */
function signRefreshToken(user) {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error("REFRESH_TOKEN_SECRET must be set");
  return jwt.sign(
    { sub: user._id.toString(), type: "refresh" },
    secret,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

function setRefreshCookie(res, token) {
  // Cookie settings for local dev (http://localhost:3000 -> http://localhost:5001)
  // httpOnly cookie stored by browser; must be set on the login response (Set-Cookie).
  const cookieOptions = {
    httpOnly: true,
    secure: false, // false for local http, true for production https
    sameSite: "lax", // localhost cross-port is same-site
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000, // 7 days
  };
  
  res.cookie("refreshToken", token, cookieOptions);
  
  if (process.env.NODE_ENV !== "production") {
    console.debug("[auth] setRefreshCookie: Setting refreshToken cookie", {
      path: REFRESH_COOKIE_PATH,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      httpOnly: cookieOptions.httpOnly,
      domain: cookieOptions.domain || "(none - exact hostname:port)",
      maxAge: `${REFRESH_DAYS} days`,
    });
    const setCookieHeader = res.getHeader("set-cookie");
    console.debug("[auth] setRefreshCookie: Set-Cookie header:", setCookieHeader || "(none)");
    if (setCookieHeader) {
      const headerStr = Array.isArray(setCookieHeader) ? setCookieHeader.join("; ") : String(setCookieHeader);
      console.debug("[auth] setRefreshCookie: refreshToken cookie name present:", headerStr.includes("refreshToken"));
      console.debug("[auth] setRefreshCookie: Full Set-Cookie value:", headerStr.substring(0, 200));
    }
  }
}

async function issueRefreshToken(user, res) {
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  await user.save();
  setRefreshCookie(res, refreshToken);
}

export async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email already used" });

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role || "client";

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: userRole
    });

    // Auto-create linked profile
    if (userRole === "client") {
      const client = await Client.create({
        name: user.name,
        email: user.email,
        preferences: {
          preferredDaysOfWeek: [1, 3, 5],
          preferredTimeRanges: [{ startTime: "18:00", endTime: "21:00" }]
        }
      });
      user.client = client._id;
      await user.save();
    }

    if (userRole === "therapist") {
      const therapist = await Therapist.create({
        name: user.name,
        specialties: ["General"],
        weeklyAvailability: []
      });
      user.therapist = therapist._id;
      await user.save();
    }

    // Access + Refresh
    const token = signAccessToken(user);
    await issueRefreshToken(user, res);

    const roleUpper = (user.role || "client").toUpperCase();
    return res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: roleUpper,
        name: user.name,
        clientId: user.client ? user.client.toString() : null,
        therapistId: user.therapist ? user.therapist.toString() : null
      }
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const normalizedEmail = (email || "").toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // Access + Refresh
    const token = signAccessToken(user);
    await issueRefreshToken(user, res);

    // Temporary debug: confirm Set-Cookie is present on login response.
    const setCookieHeader = res.getHeader("set-cookie");
    console.log("[auth] login set-cookie:", setCookieHeader ?? "(none)");
    if (process.env.NODE_ENV !== "production") {
      console.debug("[auth] login: Access token issued, refreshToken cookie being set");
      if (setCookieHeader) {
        const headerStr = Array.isArray(setCookieHeader) ? setCookieHeader.join("; ") : String(setCookieHeader);
        console.debug("[auth] login: Set-Cookie header present:", headerStr.substring(0, 150));
      } else {
        console.warn("[auth] login: WARNING - Set-Cookie header is missing! Cookie may not be set.");
      }
    }

    const role = (user.role || "client").toUpperCase();
    return res.json({
      token,
      expiresIn: ACCESS_TOKEN_TTL,
      user: {
        id: user._id.toString(),
        email: user.email,
        role,
        name: user.name,
        clientId: user.client ? user.client.toString() : null,
        therapistId: user.therapist ? user.therapist.toString() : null
      }
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/**
 * Refresh access token using httpOnly cookie refreshToken
 * - rotates refresh token each time (more secure)
 */
export async function refresh(req, res) {
  try {
    // Debug logs (do NOT log token values in production)
    if (process.env.NODE_ENV !== "production") {
      console.debug("[auth] refresh: req.headers.origin:", req.headers.origin);
      console.debug("[auth] refresh: req.headers.host:", req.headers.host);
      console.debug("[auth] refresh: cookie names received:", Object.keys(req.cookies || {}));
      console.debug("[auth] refresh: hasRefreshToken:", !!req.cookies?.refreshToken);
      const cookieHeader = req.headers.cookie || "(none)";
      console.debug("[auth] refresh: raw cookie header length:", cookieHeader.length);
      console.debug("[auth] refresh: raw cookie header preview:", cookieHeader.substring(0, 150));
      if (cookieHeader !== "(none)" && !cookieHeader.includes("refreshToken")) {
        console.warn("[auth] refresh: WARNING - Cookie header exists but does NOT contain 'refreshToken'");
      }
    }
    
    const rt = req.cookies?.refreshToken;
    if (!rt) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[auth] refresh: Missing refresh token cookie");
        console.debug("[auth] refresh: All cookies received:", Object.keys(req.cookies || {}));
        console.debug("[auth] refresh: req.cookies object:", req.cookies);
      }
      return res.status(401).json({ message: "Missing refresh token cookie" });
    }

    // Verify refresh token JWT
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    if (!refreshSecret) {
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    let decoded;
    try {
      decoded = jwt.verify(rt, refreshSecret);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        const reason = err?.name === "TokenExpiredError" ? "expired" : (err?.message || "invalid");
        console.debug("[auth] refresh: Refresh token verify failed:", reason);
      }
      return res.status(401).json({ message: "Invalid/expired refresh token" });
    }

    const userId = decoded?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid/expired refresh token" });
    }

    // Optional: ensure token matches what we last issued (rotation)
    const user = await User.findById(userId);

    if (!user) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[auth] refresh: User not found for refresh sub:", userId);
      }
      return res.status(401).json({ message: "Invalid/expired refresh token" });
    }

    const rtHash = hashToken(rt);
    if (!user.refreshTokenHash || user.refreshTokenHash !== rtHash) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[auth] refresh: Refresh token hash mismatch (rotated or revoked)");
      }
      return res.status(401).json({ message: "Invalid/expired refresh token" });
    }

    // Rotate refresh token (issue new one and set cookie)
    await issueRefreshToken(user, res);

    // Issue new access token
    const token = signAccessToken(user);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[auth] refresh: Successfully rotated refresh token and issued new access token");
    }
    return res.json({ token });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] refresh: Error:", err.message);
    }
    return res.status(400).json({ message: err.message });
  }
}

export async function logout(req, res) {
  try {
    const rt = req.cookies?.refreshToken;
    if (rt) {
      await User.updateOne(
        { refreshTokenHash: hashToken(rt) },
        { $set: { refreshTokenHash: null, refreshTokenExpiresAt: null } }
      );
    }
    // Clear cookie with same options used when setting it
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false, // must match setRefreshCookie
      sameSite: "lax", // must match setRefreshCookie
      path: REFRESH_COOKIE_PATH, // must match setRefreshCookie
    });
    return res.json({ message: "Logged out" });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/**
 * GET /api/auth/me – return the logged-in user from JWT.
 * Requires Authorization: Bearer <accessToken>. Used by frontend to restore session.
 */
export async function me(req, res) {
  try {
    const user = await User.findById(req.user.sub).select("name email role").lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    return res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: (user.role || "client").toUpperCase()
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/**
 * Debug route: GET /api/auth/debug-cookies
 * Returns cookies and raw cookie header for debugging.
 */
export async function debugCookies(req, res) {
  return res.json({
    cookieHeader: req.headers.cookie || null,
    cookies: req.cookies || {},
  });
}
