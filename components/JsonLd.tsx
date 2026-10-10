import type { Content } from "@/lib/content-model";

/**
 * JSON-LD schema.org (AutoRepair).
 * Незаполненные данные (телефон, график, улица) не выдумываются — попадают
 * в разметку только если заданы в контенте (админка).
 */
export function JsonLd({ content }: { content: Content }) {
  const { business, seo, services } = content;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: business.name,
    description: seo.description,
    url: seo.url,
    image: `${seo.url}/og-image.png`,
    logo: `${seo.url}/icon-512.png`,
    areaServed: business.city,
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.geo.lat,
      longitude: business.geo.lng,
    },
    address: {
      "@type": "PostalAddress",
      ...(business.street ? { streetAddress: business.street } : {}),
      addressLocality: business.city,
      addressRegion: business.region,
      addressCountry: "RU",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Услуги автосервиса",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title, description: s.text },
      })),
    },
  };

  if (business.phone) data.telephone = business.phone;
  if (business.email) data.email = business.email;
  if (business.openingHoursSpec) data.openingHours = business.openingHoursSpec;

  return (
    <script
      type="application/ld+json"
      // `<` экранируется, чтобы текст из админки не мог закрыть <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
