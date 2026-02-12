import { Router } from "express";
import { getAvailableSlots } from "../controllers/publicController.js";

const router = Router();

router.get("/available-slots", getAvailableSlots);

export default router;
