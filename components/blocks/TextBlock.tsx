/* eslint-disable @next/next/no-img-element */
import type { TextBlock as Data } from "@/lib/content-model";
import { BlockShell, Kicker } from "@/components/blocks/BlockShell";

/** Текст с фото: абзацы разделяются пустой строкой. */
export function TextBlock({ block }: { block: Data }) {
  const paragraphs = block.text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const body = (
    <div className={block.image ? "" : "max-w-3xl"}>
      <Kicker eyebrow={block.eyebrow} />
      {block.title && (
        <h2 className="mt-6 whitespace-pre-line font-display text-[30px] font-extrabold leading-[1.15] text-white sm:text-4xl">
          {block.title}
        </h2>
      )}
      <div className="mt-6 space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line text-base leading-relaxed text-frost/70">
            {p}
          </p>
        ))}
      </div>
    </div>
  );

  return (
    <BlockShell anchor={block.anchor} tone={block.tone}>
      {block.image ? (
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className={block.imageSide === "left" ? "lg:order-2" : ""}>{body}</div>
          <img
            src={block.image}
            alt=""
            loading="lazy"
            decoding="async"
            className={`aspect-[16/9] w-full rounded-2xl border border-white/[0.06] object-cover lg:aspect-[4/3] ${
              block.imageSide === "left" ? "lg:order-1" : ""
            }`}
          />
        </div>
      ) : (
        body
      )}
    </BlockShell>
  );
}
