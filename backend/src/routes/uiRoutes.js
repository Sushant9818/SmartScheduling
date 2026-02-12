import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/nav", requireAuth, (req, res) => {
  const role = req.user.role;

  const base = [{ label: "Home", href: "/" }, { label: "Book", href: "/book" }];
  const authed = [{ label: "Sessions", href: "/sessions" }, { label: "Clients", href: "/clients" }, { label: "Therapists", href: "/therapists" }];

  const admin = [{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }];

  const items = role === "admin" ? [...base, ...authed, ...admin] : [...base, ...authed];

  res.json({ items });
});

export default router;
