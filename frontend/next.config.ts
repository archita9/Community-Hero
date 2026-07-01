import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow local network IP for testing on other devices
  allowedDevOrigins: ['192.168.31.104'],
};

export default nextConfig;
