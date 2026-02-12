import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "client", "therapist"],
      default: "client"
    },

    // Link a user to a Client / Therapist document (for “own sessions only” filtering)
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist", default: null },

    // ---- Forgot password reset ----
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },

    // ---- Refresh token (httpOnly cookie) ----
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Ensure unique index is actually created in MongoDB
userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
