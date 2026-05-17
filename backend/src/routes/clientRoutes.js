import { Router } from "express";
import {
  createClient,
  listClients,
  getClientById,
  updateClientPreferences
} from "../controllers/clientController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const adminOnly = [requireAuth, requireRole("admin")];

router.post("/", ...adminOnly, createClient);
router.get("/", ...adminOnly, listClients);
router.get("/:id", ...adminOnly, getClientById);
router.put("/:id/preferences", ...adminOnly, updateClientPreferences);

export default router;
