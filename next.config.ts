import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photos for repurposing analysis are downscaled in the browser, but allow up to the 4 MB server limit plus form overhead.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
