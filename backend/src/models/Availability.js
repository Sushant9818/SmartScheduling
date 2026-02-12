import mongoose from "mongoose";

const DAYS_ENUM = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const HHMM_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const availabilitySchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: String,
      required: true,
      enum: DAYS_ENUM,
      uppercase: true,
    },
    startTime: {
      type: String,
      required: true,
      match: HHMM_REGEX,
    },
    endTime: {
      type: String,
      required: true,
      match: HHMM_REGEX,
    },
    recurringWeekly: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

availabilitySchema.index({ therapist: 1, dayOfWeek: 1 });

export default mongoose.model("Availability", availabilitySchema);
