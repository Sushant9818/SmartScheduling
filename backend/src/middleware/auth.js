import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Parse Authorization header: "Bearer <token>" (scheme case-insensitive).
 * Returns { ok: true, token } or { ok: false, reason }.
 */
function parseAuthorization(header) {
  if (header == null || typeof header !== "string") {
    return { ok: false, reason: "Missing Authorization header" };
  }
  const trimmed = header.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 2) {
    return { ok: false, reason: "Authorization must be 'Bearer <token>'" };
  }
  if (parts[0].toLowerCase() !== "bearer") {
    return { ok: false, reason: "Authorization scheme must be Bearer" };
  }
  const token = parts[1];
  if (!token) {
    return { ok: false, reason: "Token is empty" };
  }
  return { ok: true, token };
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (process.env.NODE_ENV !== "production") {
    const authValue = header == null ? "missing" : (header.length > 80 ? header.slice(0, 80) + "..." : header);
    console.debug("[auth] requireAuth", req.method, req.originalUrl, "req.headers.authorization:", authValue);
  }

  const parsed = parseAuthorization(header);
  if (!parsed.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[auth] requireAuth 401:", parsed.reason);
    }
    return res.status(401).json({ code: "NO_AUTH", message: parsed.reason });
  }

  const { token } = parsed;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] JWT_SECRET is not set");
    }
    return res.status(500).json({ message: "Server misconfiguration" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      const reason = err.name === "TokenExpiredError"
        ? "Token expired"
        : err.name === "JsonWebTokenError"
          ? (err.message || "Invalid token (signature or malformed)")
          : err.message || "JWT verification failed";
      console.debug("[auth] requireAuth 401 JWT verify failed:", reason);
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ code: "TOKEN_EXPIRED", message: "Access token expired" });
    }
    return res.status(401).json({ code: "TOKEN_INVALID", message: "Invalid token" });
  }

  const userId = decoded.sub || decoded.id;
  if (!userId) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[auth] requireAuth 401: token payload missing sub/id");
    }
    return res.status(401).json({ code: "TOKEN_INVALID", message: "Invalid token payload" });
  }

  User.findById(userId)
    .select("_id email role name client therapist")
    .lean()
    .then((user) => {
      if (!user) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[auth] requireAuth 401: user not found for id", userId);
        }
        return res.status(401).json({ code: "TOKEN_INVALID", message: "User not found" });
      }
      req.user = {
        id: String(user._id),
        sub: String(user._id),
        email: user.email,
        role: user.role,
        name: user.name,
        client: user.client,
        therapist: user.therapist,
        clientId: user.client ? String(user.client) : null,
        therapistId: user.therapist ? String(user.therapist) : null,
      };
      next();
    })
    .catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("[auth] requireAuth DB error:", err.message);
      }
      res.status(500).json({ message: "Authentication error" });
    });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[auth] requireRole", "user.role:", req.user?.role, "allowed:", roles, "-> 403");
      }
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
