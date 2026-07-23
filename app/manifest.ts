import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: siteConfig.name,
    description: siteConfig.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2e63ff",
    lang: siteConfig.language,
    categories: ["business", "health", "medical"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
