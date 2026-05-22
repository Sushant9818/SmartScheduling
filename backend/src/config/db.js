import mongoose from "mongoose";

function resolveMongoUri() {
  const uri = (process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
  if (!uri) return null;
  return uri;
}

function validateMongoUri(uri) {
  const isProd = process.env.NODE_ENV === "production";
  const isLocal =
    uri.includes("localhost") ||
    uri.includes("127.0.0.1") ||
    uri.startsWith("mongodb://127.0.0.1");

  if (isProd && isLocal) {
    console.error(
      "[db] MONGO_URI points to localhost. Render cannot reach your laptop's MongoDB.\n" +
        "  1) Create a free cluster at https://www.mongodb.com/cloud/atlas\n" +
        "  2) Database → Connect → Drivers → copy connection string\n" +
        "  3) Render Dashboard → your service → Environment → set MONGO_URI to mongodb+srv://...\n" +
        "  4) Atlas → Network Access → allow 0.0.0.0/0 (or Render egress IPs)\n" +
        "  5) Redeploy"
    );
    process.exit(1);
  }
}

export const connectDB = async () => {
  const uri = resolveMongoUri();
  if (!uri) {
    console.error(
      "[db] MONGO_URI is not set. Add it in Render → Environment (mongodb+srv://... from MongoDB Atlas)."
    );
    process.exit(1);
  }

  validateMongoUri(uri);

  if (process.env.NODE_ENV !== "production") {
    console.log("Connecting to MongoDB...");
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[db] Check Atlas Network Access and that MONGO_URI user/password are correct."
      );
    }
    process.exit(1);
  }
};
