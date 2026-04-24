import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Prevent static generation of pages that use database
  output: "standalone",
};

export default nextConfig;
