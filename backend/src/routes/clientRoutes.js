import { Router } from "express";
import {
  createClient,
  listClients,
  getClientById,
  updateClientPreferences
} from "../controllers/clientController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, requireRole("admin"), createClient);
router.get("/", requireAuth, requireRole("admin"), listClients);
router.get("/:id", requireAuth, requireRole("admin", "client"), getClientById);
router.put("/:id/preferences", requireAuth, requireRole("admin", "client"), updateClientPreferences);

export default router;
