import { Router } from "express";
import {
  bookSession,
  listSessions,
  getSession,
  cancelSession,
  rescheduleSession,
  updateSessionStatus,
  checkRescheduleSession,
} from "../controllers/sessionController.js";

import { requireAuth, requireRole } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();
const bookingLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

/**
 * GET /api/sessions
 * - admin: see all sessions
 * - therapist: see own sessions
 * - client: see own sessions
 */
router.get(
  "/",
  requireAuth,
  requireRole("admin", "therapist", "client"),
  listSessions
);

/**
 * GET /api/sessions/:id – single session (client: own, therapist: own, admin: any).
 */
router.get(
  "/:id",
  requireAuth,
  requireRole("admin", "therapist", "client"),
  getSession
);

/**
 * POST /api/sessions – client only: book a session (req.user.clientId; body: therapistId, startAt, endAt, notes?).
 * Production: uses MongoDB transaction. Non-production: same checks without transaction (works on standalone Mongo).
 */
router.post(
  "/",
  requireAuth,
  requireRole("client"),
  bookingLimiter,
  bookSession
);

/**
 * POST /api/sessions/book – same as POST / (client only).
 */
router.post(
  "/book",
  requireAuth,
  requireRole("client"),
  bookingLimiter,
  bookSession
);

/**
 * PATCH /api/sessions/:id/cancel
 * - admin: allowed
 * - client: allowed (own session)
 * - therapist: allowed (own session)
 */
router.patch(
  "/:id/cancel",
  requireAuth,
  requireRole("admin", "client", "therapist"),
  cancelSession
);

/**
 * POST /api/sessions/:id/reschedule-check
 * Body: { startAt: ISO string, endAt: ISO string }.
 */
router.post(
  "/:id/reschedule-check",
  requireAuth,
  requireRole("admin", "client", "therapist"),
  checkRescheduleSession
);

/**
 * PATCH /api/sessions/:id/reschedule
 * Body: { startAt: ISO string, endAt: ISO string }. Client: own sessions only; therapist: own; admin: any.
 */
router.patch(
  "/:id/reschedule",
  requireAuth,
  requireRole("admin", "client", "therapist"),
  rescheduleSession
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin", "client", "therapist"),
  updateSessionStatus
);

export default router;
