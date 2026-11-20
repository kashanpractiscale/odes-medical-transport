import type { MetadataRoute } from "next";
import { COMPANY, SEO } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: COMPANY.name,
    short_name: "Odes",
    description: SEO.description,
    start_url: "/",
    display: "standalone",
    background_color: "#071211",
    theme_color: "#071211",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
