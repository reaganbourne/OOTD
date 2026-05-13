import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  images: {
    remotePatterns: [
      // Production: S3 bucket in any region
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      // Production: CloudFront CDN
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
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
