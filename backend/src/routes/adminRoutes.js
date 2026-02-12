import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

import {
  getStatsOverview,
  getSessionsPerWeek,
  deleteClientProfile,
  deleteTherapistProfile,
  createTherapistWithUser,
  updateTherapist,
  updateClient,
} from "../controllers/adminController.js";
import {
  getUsers as getAdminUsers,
  createUser as createAdminUser,
  updateUser as updateAdminUser,
  deleteUser as deleteAdminUser,
} from "../controllers/adminUserController.js";

import { getTherapists, getTherapistById } from "../controllers/therapistController.js";
import {
  listClients,
  getClientById,
  createClient,
} from "../controllers/clientController.js";
import {
  listSessions,
  bookSession,
  rescheduleSession,
  updateSessionStatus,
  deleteSession,
} from "../controllers/sessionController.js";
import {
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  listAllAvailability,
} from "../controllers/availabilityController.js";

const router = Router();
const admin = [requireAuth, requireRole("admin")];

// Stats
router.get("/stats/overview", ...admin, getStatsOverview);
router.get("/stats/sessions-per-week", ...admin, getSessionsPerWeek);

// Users: GET list (with ?role=&q=), POST create, PATCH update, DELETE
router.get("/users", ...admin, getAdminUsers);
router.post("/users", ...admin, createAdminUser);
router.patch("/users/:id", ...admin, updateAdminUser);
router.delete("/users/:id", ...admin, deleteAdminUser);
// Therapists: GET all, GET one, POST create (user+therapist), PATCH update, DELETE
router.get("/therapists", ...admin, getTherapists);
router.get("/therapists/:id", ...admin, getTherapistById);
router.post("/therapists", ...admin, createTherapistWithUser);
router.patch("/therapists/:id", ...admin, updateTherapist);
router.delete("/therapists/:id", ...admin, deleteTherapistProfile);

// Clients: GET all, GET one, POST create, PATCH update, DELETE
router.get("/clients", ...admin, listClients);
router.get("/clients/:id", ...admin, getClientById);
router.post("/clients", ...admin, createClient);
router.patch("/clients/:id", ...admin, updateClient);
router.delete("/clients/:id", ...admin, deleteClientProfile);

// Sessions: GET all, POST create (book), PATCH reschedule/status, DELETE
router.get("/sessions", ...admin, listSessions);
router.post("/sessions", ...admin, bookSession);
router.patch("/sessions/:id/reschedule", ...admin, rescheduleSession);
router.patch("/sessions/:id/status", ...admin, updateSessionStatus);
router.delete("/sessions/:id", ...admin, deleteSession);

// Availability: GET all (or ?therapistId= for one), POST create, PATCH update, DELETE
router.get("/availability", ...admin, (req, res, next) => {
  if (req.query.therapistId != null && String(req.query.therapistId).trim() !== "") {
    return getAvailability(req, res, next);
  }
  return listAllAvailability(req, res, next);
});
router.post("/availability", ...admin, createAvailability);
router.patch("/availability/:id", ...admin, updateAvailability);
router.delete("/availability/:id", ...admin, deleteAvailability);

export default router;
