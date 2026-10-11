import type { Block } from "@/lib/content-model";
import { ServicesBlock } from "@/components/blocks/ServicesBlock";
import { FeaturesBlock } from "@/components/blocks/FeaturesBlock";
import { GalleryBlock } from "@/components/blocks/GalleryBlock";
import { TextBlock } from "@/components/blocks/TextBlock";
import { CardsBlock } from "@/components/blocks/CardsBlock";
import { FaqBlock } from "@/components/blocks/FaqBlock";
import { PricesBlock } from "@/components/blocks/PricesBlock";
import { CtaBlock } from "@/components/blocks/CtaBlock";
import { ReviewsBlock } from "@/components/blocks/ReviewsBlock";
import { BrandsBlock } from "@/components/blocks/BrandsBlock";

/** Раздел страницы по его типу (бренд). Тип и поля — в движке (lib/content-model.ts), здесь — вёрстка. */
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "services":
      return <ServicesBlock block={block} />;
    case "features":
      return <FeaturesBlock block={block} />;
    case "gallery":
      return <GalleryBlock block={block} />;
    case "text":
      return <TextBlock block={block} />;
    case "cards":
      return <CardsBlock block={block} />;
    case "faq":
      return <FaqBlock block={block} />;
    case "prices":
      return <PricesBlock block={block} />;
    case "cta":
      return <CtaBlock block={block} />;
    case "reviews":
      return <ReviewsBlock block={block} />;
    case "brands":
      return <BrandsBlock block={block} />;
    default: {
      // Новый тип в движке без отрисовки здесь — ошибка сборки, а не пустое место на сайте.
      const missing: never = block;
      return missing;
    }
  }
}
