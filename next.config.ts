import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Every page is per-user and behind login, so pages render on request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
