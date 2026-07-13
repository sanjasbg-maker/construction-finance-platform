import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, too small for uploaded invoice PDFs and scanned
      // construction documents/photos.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
