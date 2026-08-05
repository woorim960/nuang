import type { MetadataRoute } from "next";
import { NUANG_SITE_ORIGIN } from "@/features/seo/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    host: NUANG_SITE_ORIGIN,
    rules: [
      {
        allow: ["/", "/_next/static/", "/assets/", "/icons/", "/images/"],
        disallow: ["/admin/", "/api/"],
        userAgent: "*",
      },
    ],
    sitemap: `${NUANG_SITE_ORIGIN}/sitemap.xml`,
  };
}
