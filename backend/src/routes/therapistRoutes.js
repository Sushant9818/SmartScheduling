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
  if (req.user?.role === "admin") {
    return next();
  }

  if (req.user?.role === "therapist" && req.user.therapistId === req.params.id) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden" });
}

router.get("/", requireAuth, requireRole("admin", "therapist", "client"), getTherapists);
router.get("/:id", requireAuth, requireRole("admin", "therapist", "client"), getTherapistById);
router.post("/", requireAuth, requireRole("admin"), createTherapist);
router.put("/:id/availability", requireAuth, requireTherapistOwnerOrAdmin, updateAvailability);
router.post("/:id/time-off", requireAuth, requireTherapistOwnerOrAdmin, addTimeOff);

export default router;
