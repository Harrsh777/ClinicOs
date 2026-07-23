import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/administrator",
          "/owner",
          "/doctor",
          "/nurse",
          "/receptionist",
          "/pharmacist",
          "/lab-tech",
          "/finance",
          "/hr",
          "/patient",
          "/api",
          "/print",
          "/activate",
          "/invite",
          "/reset-password",
          "/check-in",
          "/queue",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl(),
  };
}
