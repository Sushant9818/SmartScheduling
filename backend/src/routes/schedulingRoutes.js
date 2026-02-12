import { Router } from "express";
import { suggestSlots } from "../controllers/schedulingController.js";

const router = Router();
router.post("/suggest", suggestSlots);

export default router;
