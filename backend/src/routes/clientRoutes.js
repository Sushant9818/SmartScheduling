import { Router } from "express";
import {
  createClient,
  listClients,
  getClientById,
  updateClientPreferences
} from "../controllers/clientController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function requireClientOwnerOrAdmin(req, res, next) {
  if (req.user?.role === "admin") {
    return next();
  }

  if (req.user?.role === "client" && req.user.clientId === req.params.id) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden" });
}

router.post("/", requireAuth, requireRole("admin"), createClient);
router.get("/", requireAuth, requireRole("admin"), listClients);
router.get("/:id", requireAuth, requireClientOwnerOrAdmin, getClientById);
router.put("/:id/preferences", requireAuth, requireClientOwnerOrAdmin, updateClientPreferences);

export default router;
