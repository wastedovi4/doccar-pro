import type { PricesBlock as Data } from "@/lib/content-model";
import { BlockHeading, BlockShell } from "@/components/blocks/BlockShell";

/** Прайс: название, примечание, цена справа. */
export function PricesBlock({ block }: { block: Data }) {
  const items = block.items.filter((x) => x.name.trim());
  return (
    <BlockShell anchor={block.anchor} tone={block.tone}>
      <BlockHeading title={block.title} className="mb-10" />
      <div className="panel divide-y divide-white/[0.07] bg-night/40">
        {items.map((item, i) => (
          <div key={i} className="flex items-baseline justify-between gap-6 px-6 py-4">
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-white">{item.name}</div>
              {item.note && <div className="mt-0.5 text-xs text-frost/50">{item.note}</div>}
            </div>
            <div className="shrink-0 whitespace-nowrap font-display text-base font-bold text-accent">{item.price}</div>
          </div>
        ))}
      </div>
      {block.text && <p className="mt-4 whitespace-pre-line text-sm text-frost/50">{block.text}</p>}
    </BlockShell>
  );
}
