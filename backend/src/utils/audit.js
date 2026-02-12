import AuditLog from "../models/AuditLog.js";

export async function audit(req, { action, entityType, entityId, meta = {} }) {
  try {
    await AuditLog.create({
      actorUserId: req.user?.sub || req.user?.id,
      actorRole: req.user?.role,
      action,
      entityType,
      entityId,
      meta
    });
  } catch {
    // never block main request
  }
}
