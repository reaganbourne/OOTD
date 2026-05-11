import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Production: S3 bucket in any region
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      // Development: local FastAPI upload server
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
    ],
    // Serve modern formats (WebP/AVIF) automatically
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
