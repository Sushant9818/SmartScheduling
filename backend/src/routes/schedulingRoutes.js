import { Router } from "express";
import { suggestSlots } from "../controllers/schedulingController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.post("/suggest", requireAuth, requireRole("admin", "client", "therapist"), suggestSlots);

export default router;
