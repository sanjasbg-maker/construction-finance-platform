import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, too small for uploaded invoice PDFs.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
