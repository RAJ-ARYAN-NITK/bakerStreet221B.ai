import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",   // enables multi-stage Docker builds
};

export default nextConfig;
