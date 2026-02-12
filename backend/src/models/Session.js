import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled"
    },
    notes: { type: String, default: null }
  },
  { timestamps: true }
);

// Guard against double-booking races
sessionSchema.index(
  { therapist: 1, start: 1, end: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "scheduled" } }
);

export default mongoose.model("Session", sessionSchema);
