import { Plus } from "lucide-react";
import type { FaqBlock as Data } from "@/lib/content-model";
import { BlockHeading, BlockShell } from "@/components/blocks/BlockShell";

/** Вопросы и ответы — нативный <details>, без JS. */
export function FaqBlock({ block }: { block: Data }) {
  const items = block.items.filter((x) => x.q.trim());
  return (
    <BlockShell anchor={block.anchor} tone={block.tone}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <BlockHeading eyebrow={block.eyebrow} title={block.title} />
        <div className="space-y-3">
          {items.map((item, i) => (
            <details key={i} className="panel group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-bold text-white">
                {item.q}
                <Plus
                  className="h-5 w-5 shrink-0 text-accent transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-frost/70">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}
