import mongoose from "mongoose";

export const connectDB = async () => {
  if (!process.env.MONGO_URI?.trim()) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }
  if (process.env.NODE_ENV !== "production") {
    console.log("Connecting to MongoDB...");
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

