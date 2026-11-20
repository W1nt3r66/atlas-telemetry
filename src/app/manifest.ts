import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas",
    short_name: "Atlas",
    description: "Minimal F1-inspired car telemetry, mileage & garage app",
    start_url: "/",
    display: "standalone",
    background_color: "#091926",
    theme_color: "#025cbc",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
