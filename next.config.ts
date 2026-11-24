import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Headless Chrome for the resume PDF must stay a plain Node dependency (not bundled).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // The PDF route reads the embedded resume font from node_modules at runtime.
  outputFileTracingIncludes: { "/api/resume/pdf": ["./node_modules/@fontsource/arimo/files/arimo-latin*-{400,700}-normal.woff2", "./node_modules/@sparticuz/chromium/bin/**"] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: process.env.NODE_ENV === "development" ? "SAMEORIGIN" : "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
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
