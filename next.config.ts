import type { NextConfig } from "next";

const nextConfig: any = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
};

export default nextConfig;
