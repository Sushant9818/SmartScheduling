import { Router } from "express";
import {
  createTherapist,
  getTherapists,
  getTherapistById,
  updateAvailability,
  addTimeOff
} from "../controllers/therapistController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/", createTherapist);
router.get("/", getTherapists);
router.get("/:id", getTherapistById);
router.put("/:id/availability", updateAvailability);
router.post("/:id/time-off", addTimeOff);
router.post("/", requireAuth, requireRole("admin"), createTherapist);
router.put("/:id/availability", requireAuth, requireRole("admin", "therapist"), updateAvailability);
router.post("/:id/time-off", requireAuth, requireRole("admin", "therapist"), addTimeOff);

export default router;
