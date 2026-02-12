import { Router } from "express";
import { register, login, refresh, logout, me, debugCookies } from "../controllers/authController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/**
 * Public registration (client/therapist only)
 * Admin registration blocked here
 */
router.post(
  "/register",
  (req, res, next) => {
    if (req.body.role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be created publicly" });
    }
    next();
  },
  register
);

/**
 * Admin-only creation (can create admin)
 */
router.post("/register-admin", requireAuth, requireRole("admin"), register);

/**
 * Current user from JWT (GET, requires Authorization: Bearer <token>)
 */
router.get("/me", requireAuth, me);

/**
 * Login (public)
 */
router.post("/login", login);

/**
 * Refresh access token using refresh cookie
 */
router.post("/refresh", refresh);

/**
 * Logout (clears refresh cookie)
 */
router.post("/logout", logout);

/**
 * Debug route: GET /api/auth/debug-cookies
 * Returns cookies received by backend (for debugging cookie issues).
 */
router.get("/debug-cookies", debugCookies);

export default router;

