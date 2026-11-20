import { ALSO_AVAILABLE, COMPANY, SEO, SERVICES, SITE_URL } from "@/lib/site";

/**
 * schema.org description of the business for search engines (Google's local results and
 * knowledge panel) and AI assistants. Only facts already on the site are stated: there is no
 * street address, opening hours, price range or rating to add, and inventing them would be
 * worse than leaving them out.
 */
export function StructuredData() {
  const business = `${SITE_URL}/#business`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalBusiness",
        "@id": business,
        name: COMPANY.name,
        legalName: COMPANY.legalName,
        description: SEO.description,
        slogan: "Care that travels with you.",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/brand/odes-logo.png`,
        image: `${SITE_URL}/opengraph-image.jpg`,
        telephone: COMPANY.phoneHref.replace("tel:", ""),
        email: COMPANY.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Gardena",
          addressRegion: "CA",
          postalCode: "90247",
          addressCountry: "US",
        },
        areaServed: { "@type": "AdministrativeArea", name: "Los Angeles County, California" },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "reservations",
          telephone: COMPANY.phoneHref.replace("tel:", ""),
          email: COMPANY.email,
          areaServed: "US-CA",
          availableLanguage: "English",
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Non-emergency medical transportation",
          itemListElement: [
            ...SERVICES.map((s) => ({ name: s.name, description: s.body })),
            ...ALSO_AVAILABLE.map((name) => ({ name })),
          ].map((service) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", serviceType: "Non-emergency medical transportation", ...service },
          })),
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: COMPANY.name,
        inLanguage: "en-US",
        publisher: { "@id": business },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // `<` escaped so no string in the data can close the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
