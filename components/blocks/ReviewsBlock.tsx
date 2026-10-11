import { Quote } from "lucide-react";
import type { ReviewsBlock as Data } from "@/lib/content-model";
import { BlockHeading, BlockShell } from "@/components/blocks/BlockShell";

/** Отзывы клиентов. */
export function ReviewsBlock({ block }: { block: Data }) {
  const items = block.items.filter((x) => x.text.trim());
  return (
    <BlockShell anchor={block.anchor} tone={block.tone}>
      <BlockHeading title={block.title} className="mb-10" />
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((r, i) => (
          <li key={i} className="panel flex flex-col bg-night/40 p-6">
            <Quote className="h-7 w-7 text-accent" aria-hidden />
            <p className="mt-4 flex-1 whitespace-pre-line text-[15px] leading-relaxed text-frost/80">{r.text}</p>
            <div className="mt-6 border-t border-white/[0.07] pt-4">
              <div className="font-semibold text-white">{r.name}</div>
              {r.meta && <div className="mt-0.5 text-xs text-frost/50">{r.meta}</div>}
            </div>
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}
