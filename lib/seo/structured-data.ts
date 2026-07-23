import { absoluteUrl, siteConfig } from "@/lib/seo/site";

export function buildHomeStructuredData() {
  const siteUrl = absoluteUrl();
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;
  const softwareId = `${siteUrl}/#software`;
  const founderId = `${siteUrl}/#founder`;
  const webpageId = `${siteUrl}/#webpage`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        url: siteUrl,
        logo: absoluteUrl("/favicon.ico"),
        image: absoluteUrl("/opengraph-image"),
        description: siteConfig.description,
        email: siteConfig.contactEmail,
        foundingLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: siteConfig.city,
            addressRegion: siteConfig.region,
            addressCountry: siteConfig.country,
          },
        },
        areaServed: {
          "@type": "Country",
          name: "India",
        },
        founder: { "@id": founderId },
        brand: {
          "@type": "Brand",
          name: siteConfig.name,
          slogan: siteConfig.tagline,
        },
        sameAs: [siteConfig.founder.url],
      },
      {
        "@type": "Person",
        "@id": founderId,
        name: siteConfig.founder.name,
        url: siteConfig.founder.url,
        jobTitle: siteConfig.founder.title,
        worksFor: { "@id": organizationId },
        knowsAbout: [
          "Clinic growth",
          "Healthcare technology",
          "AI for clinics",
          "Practice management",
        ],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: siteConfig.name,
        description: siteConfig.shortDescription,
        inLanguage: siteConfig.language,
        publisher: { "@id": organizationId },
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: siteUrl,
        name: siteConfig.title,
        description: siteConfig.description,
        isPartOf: { "@id": websiteId },
        about: { "@id": softwareId },
        inLanguage: siteConfig.language,
        primaryImageOfPage: absoluteUrl("/opengraph-image"),
      },
      {
        "@type": "SoftwareApplication",
        "@id": softwareId,
        name: siteConfig.name,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Clinic Growth Software",
        operatingSystem: "Web",
        url: siteUrl,
        description: siteConfig.description,
        featureList: siteConfig.features,
        offers: siteConfig.pricingPlans.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: plan.price,
          priceCurrency: plan.currency,
          url: `${siteUrl}/#pricing`,
          availability: "https://schema.org/InStock",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: plan.price,
            priceCurrency: plan.currency,
            unitText: plan.billing,
          },
        })),
        audience: {
          "@type": "Audience",
          audienceType:
            "Clinic owners, doctors, and healthcare providers in India",
          geographicArea: {
            "@type": "Country",
            name: "India",
          },
        },
        provider: { "@id": organizationId },
        creator: { "@id": founderId },
        countriesSupported: "IN",
        inLanguage: siteConfig.language,
      },
    ],
  };
}
