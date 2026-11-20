import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// A single page today; the sections are anchors on it, which search engines don't index separately.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 }];
}
