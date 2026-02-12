import { Router } from "express";
import {
  createClient,
  listClients,
  getClientById,
  updateClientPreferences
} from "../controllers/clientController.js";

const router = Router();

router.post("/", createClient);
router.get("/", listClients);
router.get("/:id", getClientById);
router.put("/:id/preferences", updateClientPreferences);

export default router;
