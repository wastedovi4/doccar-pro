import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { BlockView } from "@/components/blocks";
import { Contacts } from "@/components/Contacts";
import { Footer } from "@/components/Footer";
import { MobileCTA } from "@/components/MobileCTA";
import { BookingDialog } from "@/components/BookingDialog";
import { JsonLd } from "@/components/JsonLd";
import { getContent, navItems, serviceTitles } from "@/lib/content";

// Контент читается из файла на каждый запрос — правки из админки видны сразу.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await getContent();
  const { business } = content;
  const nav = navItems(content);

  return (
    <>
      <Header nav={nav} business={business} />
      <main id="top">
        <Hero hero={content.hero} />
        {content.blocks
          .filter((b) => b.visible)
          .map((b) => (
            <BlockView key={b.id} block={b} />
          ))}
        <Contacts cta={content.cta} business={business} />
      </main>
      <Footer business={business} nav={nav} />
      {/* Отступ, чтобы контент не перекрывался липкой мобильной CTA-панелью */}
      <div className="h-14 lg:hidden" aria-hidden />
      <MobileCTA phone={business.phone} geo={business.geo} />
      <BookingDialog services={serviceTitles(content)} />
      <JsonLd content={content} />
    </>
  );
}
