import { LandingSplash } from "@/components/brand/landing-splash";
import { ClinicosLanding } from "@/components/landing/clinicos-landing";
import { JsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/metadata";
import { buildHomeStructuredData } from "@/lib/seo/structured-data";
import { siteConfig } from "@/lib/seo/site";

export const metadata = {
  ...createPageMetadata({
    description: siteConfig.description,
    path: "/",
  }),
  title: {
    absolute: siteConfig.title,
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomeStructuredData()} />
      <LandingSplash>
        <ClinicosLanding />
      </LandingSplash>
    </>
  );
}
