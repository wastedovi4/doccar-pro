import type { BrandsBlock as Data } from "@/lib/content-model";
import { BlockHeading, BlockShell } from "@/components/blocks/BlockShell";

/** Марки, которые обслуживает сервис: плитки с названиями + сноска. */
export function BrandsBlock({ block }: { block: Data }) {
  if (block.items.length === 0 && !block.title) return null;
  return (
    <BlockShell anchor={block.anchor} tone={block.tone} label={block.title ? undefined : "Марки"}>
      <BlockHeading eyebrow={block.eyebrow} title={block.title} text={block.text} className="mb-10" />
      {block.items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {block.items.map((brand, i) => (
            <li
              key={`${brand}-${i}`}
              className="panel flex min-h-[72px] items-center justify-center px-3 py-4 text-center font-display text-[15px] font-bold tracking-wide text-white"
            >
              {brand}
            </li>
          ))}
        </ul>
      )}
      {block.note && <p className="mt-4 text-xs leading-relaxed text-frost/40">{block.note}</p>}
    </BlockShell>
  );
}
