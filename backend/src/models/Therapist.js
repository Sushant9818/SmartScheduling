import mongoose from "mongoose";

const timeBlockSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }    // "17:00"
  },
  { _id: false }
);

const timeOffSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: { type: String }
  },
  { _id: false }
);

const therapistSchema = new mongoose.Schema(
  {
    // ✅ Link therapist profile to auth user (JWT sub === User._id)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      unique: true,
      sparse: true, // ✅ prevents duplicate issues for old docs missing this field
    },

    // ✅ For lookup + notifications
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
      sparse: true, // ✅ allows old docs without email
    },

    name: { type: String, required: true },
    specialties: { type: [String], default: [] },
    weeklyAvailability: { type: [timeBlockSchema], default: [] },
    timeOff: { type: [timeOffSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("Therapist", therapistSchema);


