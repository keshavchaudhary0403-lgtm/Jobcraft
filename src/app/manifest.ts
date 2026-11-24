import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jobcraft",
    short_name: "Jobcraft",
    description: "Your AI job search copilot.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f3f7",
    theme_color: "#004e98",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
