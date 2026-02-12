import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, default: null },
    action: { type: String, required: true },      // BOOK_SESSION, CANCEL_SESSION, RESCHEDULE_SESSION
    entityType: { type: String, required: true },  // "Session"
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    meta: { type: Object, default: {} }
  },
  { timestamps: true }
);

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
