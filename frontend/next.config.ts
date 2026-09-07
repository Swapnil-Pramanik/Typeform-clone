import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root sits above this package; without it Turbopack walks up and
  // picks the wrong lockfile.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
