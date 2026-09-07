import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this package. Without it Turbopack walks up
  // looking for a lockfile and can latch onto one outside the repository.
  turbopack: { root: __dirname },
};

export default nextConfig;
