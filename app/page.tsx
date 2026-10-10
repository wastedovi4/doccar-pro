import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { About } from "@/components/About";
import { Gallery } from "@/components/Gallery";
import { Contacts } from "@/components/Contacts";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BookingDialog } from "@/components/BookingDialog";
import { JsonLd } from "@/components/JsonLd";
import { getContent } from "@/lib/content";

// Контент читается из файла на каждый запрос — правки из админки видны сразу.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await getContent();
  const { sections, business } = content;

  return (
    <>
      <Header sections={sections} business={business} />
      <main id="top">
        <Hero hero={content.hero} />
        {sections.services && <Services services={content.services} />}
        {sections.about && <About about={content.about} />}
        {sections.gallery && <Gallery photos={content.gallery} />}
        <Contacts cta={content.cta} business={business} />
      </main>
      <Footer business={business} sections={sections} />
      {/* Отступ, чтобы контент не перекрывался липкой мобильной CTA-панелью */}
      <div className="h-14 lg:hidden" aria-hidden />
      <MobileCTA phone={business.phone} geo={business.geo} />
      <BookingDialog services={content.services.map((s) => s.title).filter(Boolean)} />
      <JsonLd content={content} />
    </>
  );
}
