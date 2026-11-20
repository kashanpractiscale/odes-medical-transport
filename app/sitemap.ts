import type { MetadataRoute } from "next";
import { ROUTES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(ROUTES).map((path) => ({
    url: `${SITE_URL}${path === "/" ? "/" : path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : path === "/book" ? 0.9 : 0.8,
  }));
}
