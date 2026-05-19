import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo: resolve modules from frontend when Vercel builds from repo root
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
