import { Router } from "express";
import { requestPasswordReset, resetPassword, changePassword } from "../controllers/passwordController.js";
import { requireAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
router.post("/forgot", resetLimiter, requestPasswordReset);
router.post("/reset", resetLimiter, resetPassword);

router.post("/change", requireAuth, changePassword);

export default router;
