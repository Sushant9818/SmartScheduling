import { Router } from "express";
import {
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "../controllers/availabilityController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "therapist", "client"), getAvailability);
router.post("/", requireAuth, requireRole("admin", "therapist"), createAvailability);
router.patch("/:id", requireAuth, requireRole("admin", "therapist"), updateAvailability);
router.delete("/:id", requireAuth, requireRole("admin", "therapist"), deleteAvailability);

export default router;
