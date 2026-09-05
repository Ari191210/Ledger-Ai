import type { MetadataRoute } from "next";

const BASE_URL = "https://studyledger.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/tools",
        "/tools/",
        "/score",
        "/settings",
        "/onboard",
        "/dev",
        "/dev/",
        "/api/",
        "/auth/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
