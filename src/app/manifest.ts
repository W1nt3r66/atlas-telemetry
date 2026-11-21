import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas — Telemetry, Mileage & Garage",
    short_name: "Atlas",
    description:
      "Telemetry, mileage tracking, route strategy, and garage management.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b151e",
    theme_color: "#025cbc",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
