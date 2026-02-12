import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema(
  {
    preferredDaysOfWeek: { type: [Number], default: [] }, // 0-6
    preferredTimeRanges: {
      type: [{ startTime: String, endTime: String }],
      default: []
    },
    preferredTherapistIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Therapist",
      default: []
    },
    hardConstraints: {
      noEarlyThan: { type: String }, // "09:00"
      noLaterThan: { type: String }  // "20:00"
    }
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    preferences: { type: preferenceSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
