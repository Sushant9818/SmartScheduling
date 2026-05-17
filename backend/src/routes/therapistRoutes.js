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

function requireTherapistOwnerOrAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  if (req.user?.role === "therapist" && req.user.therapistId === req.params.id) {
    return next();
  }
  return res.status(403).json({ message: "Forbidden" });
}

router.get("/", getTherapists);
router.get("/:id", getTherapistById);

router.post("/", requireAuth, requireRole("admin"), createTherapist);
router.put("/:id/availability", requireAuth, requireRole("admin", "therapist"), requireTherapistOwnerOrAdmin, updateAvailability);
router.post("/:id/time-off", requireAuth, requireRole("admin", "therapist"), requireTherapistOwnerOrAdmin, addTimeOff);

export default router;
