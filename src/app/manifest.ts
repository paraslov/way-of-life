import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyLife",
    short_name: "MyLife",
    description: "Образ жизни 40 → 80",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    // Matches the icon artwork background.
    background_color: "#1c2321",
    theme_color: "#1c2321",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
