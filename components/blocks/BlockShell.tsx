import type { Tone } from "@/lib/content-model";

/** Обёртка раздела: якорь + фон. Ритм отступов общий для всех типов. */
export function BlockShell({
  anchor,
  tone,
  label,
  children,
}: {
  anchor: string;
  tone: Tone;
  label?: string; // aria-label, если у раздела нет видимого заголовка
  children: React.ReactNode;
}) {
  return (
    <section
      id={anchor}
      aria-label={label}
      className={tone === "raised" ? "border-y border-white/[0.05] bg-coal py-16 lg:py-24" : "py-12 sm:py-16"}
    >
      <div className="container-x">{children}</div>
    </section>
  );
}

/** Над заголовком: надзаголовок раздела, если задан, иначе фирменная черта. */
export function Kicker({ eyebrow }: { eyebrow?: string }) {
  return eyebrow ? <p className="eyebrow">{eyebrow}</p> : <span className="rule" aria-hidden />;
}

/** Заголовок раздела: надзаголовок или черта, H2 (переносы строк сохраняются), текст. */
export function BlockHeading({
  eyebrow,
  title,
  text,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  className?: string;
}) {
  if (!title && !text && !eyebrow) return null;
  return (
    <div className={`max-w-3xl ${className}`}>
      <Kicker eyebrow={eyebrow} />
      {title && (
        <h2 className="mt-6 whitespace-pre-line font-display text-[30px] font-extrabold leading-[1.15] text-white sm:text-4xl">
          {title}
        </h2>
      )}
      {text && <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-frost/65">{text}</p>}
    </div>
  );
}
