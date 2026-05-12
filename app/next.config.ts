import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      root: "./app",
    },
  },
};

export default nextConfig;
