import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await getContent();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/r/"] },
    ],
    sitemap: `${seo.url}/sitemap.xml`,
  };
}
