import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this package. Without it Turbopack walks up
  // looking for a lockfile and can latch onto one outside the repository;
  // pointing it at the parent instead would put the root outside the directory
  // the deployment actually builds.
  turbopack: { root: __dirname },
};

export default nextConfig;
