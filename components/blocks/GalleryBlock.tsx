/* eslint-disable @next/next/no-img-element */
import type { GalleryBlock as Data } from "@/lib/content-model";
import { BlockHeading, BlockShell } from "@/components/blocks/BlockShell";

/** Лента фото. На мобильном — горизонтальная прокрутка со «щелчком». */
export function GalleryBlock({ block }: { block: Data }) {
  if (block.photos.length === 0) return null;
  return (
    <BlockShell anchor={block.anchor} tone={block.tone} label={block.title ? undefined : "Фото сервиса"}>
      <BlockHeading eyebrow={block.eyebrow} title={block.title} className="mb-10" />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-hidden sm:rounded-2xl sm:px-0 sm:pb-0">
        {block.photos.map((p, i) => (
          <li key={`${p.src}-${i}`} className="w-[82%] shrink-0 snap-start overflow-hidden rounded-xl sm:w-auto sm:rounded-none">
            <img src={p.src} alt={p.alt} loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover" />
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}
