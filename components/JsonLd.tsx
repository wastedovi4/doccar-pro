import type { Content, FaqBlock, ServicesBlock } from "@/lib/content-model";

/**
 * JSON-LD schema.org: AutoRepair (+ FAQPage, если есть видимые разделы FAQ).
 * Незаполненные данные (телефон, график, улица) не выдумываются — попадают
 * в разметку только если заданы в контенте (админка).
 */
export function JsonLd({ content }: { content: Content }) {
  const { business, seo } = content;
  const visible = content.blocks.filter((b) => b.visible);
  const services = visible
    .filter((b): b is ServicesBlock => b.type === "services")
    .flatMap((b) => b.items)
    .filter((s) => s.title.trim());
  const faq = visible
    .filter((b): b is FaqBlock => b.type === "faq")
    .flatMap((b) => b.items)
    .filter((x) => x.q.trim() && x.a.trim());

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
  const sameAs = [business.telegram, business.whatsapp].filter(Boolean);
  if (sameAs.length) data.sameAs = sameAs;

  const graphs: Record<string, unknown>[] = [data];
  if (faq.length) {
    graphs.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((x) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.a },
      })),
    });
  }

  return (
    <>
      {graphs.map((g, i) => (
        <script
          key={i}
          type="application/ld+json"
          // `<` экранируется, чтобы текст из админки не мог закрыть <script>.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(g).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
