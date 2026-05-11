import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com"
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net"
      },
      {
        protocol: "https",
        hostname: "cdn.example.com"
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**"
      }
    ],
    formats: ["image/avif", "image/webp"]
  }
};

export default nextConfig;
