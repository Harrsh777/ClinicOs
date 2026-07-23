import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/seo/site";

type PageMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogImage?: string;
};

export function createPageMetadata(options: PageMetadataOptions = {}): Metadata {
  const title = options.title ?? siteConfig.title;
  const description = options.description ?? siteConfig.description;
  const canonical = absoluteUrl(options.path ?? "/");
  const keywords = options.keywords ?? [...siteConfig.keywords];
  const ogImage = options.ogImage ?? absoluteUrl("/opengraph-image");

  return {
    metadataBase: new URL(absoluteUrl()),
    title,
    description,
    keywords,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.founder.name, url: siteConfig.founder.url }],
    creator: siteConfig.founder.name,
    publisher: siteConfig.legalName,
    category: "Healthcare Technology",
    alternates: {
      canonical,
      languages: {
        "en-IN": canonical,
      },
    },
    robots: options.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: "website",
      locale: siteConfig.locale.replace("_", "-"),
      url: canonical,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} — ${siteConfig.tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.social.twitter,
      creator: siteConfig.social.twitter,
      title,
      description,
      images: [ogImage],
    },
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  };
}
