/**
 * Логотип DOCCAR.PRO: знак «D + пульс» (inline SVG) + вордмарк текстом.
 * Геометрия знака сгенерирована скриптом (miter-контур линии пульса), те же
 * координаты использованы для favicon/PNG-иконок — знак везде одинаковый.
 */

const D_PATH = "M10 8H67A42 42 0 0 1 67 92H22L36 73H67A23 23 0 0 0 67 27H29Z";
const TAIL = "0.03,54.20 39.15,54.50 38.85,48.70 -0.03,53.00";
const PULSE =
  "28.06,77.41 49.09,45.98 60.04,66.60 71.07,51.38 114.02,47.80 113.98,46.60 68.19,45.68 61.37,53.62 50.16,29.76 20.94,72.59";

const TONES = {
  // на тёмном фоне: светлая D, лаймовый пульс, ореол цвета фона
  dark: { d: "#E8ECEF", pulse: "#C6F34A", halo: "#101318" },
  // на белом (печать): тёмный знак на лаймовой плитке, ореол лаймовый
  tile: { d: "#101318", pulse: "#101318", halo: "#C6F34A" },
} as const;

/** Плитка под знаком для tone="tile": скруглённый лаймовый квадрат с полем вокруг знака. */
const TILE_BOX = "-12 -4 139 108";

/**
 * Знак. Контракт движка (docs/ENGINE.md): tone="dark" (по умолчанию) — на тёмном
 * фоне; tone="tile" — для белой бумаги (печать наряда), подложку рисует сам знак.
 */
export function LogoMark({
  tone = "dark",
  className = "",
}: {
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const c = TONES[tone];
  return (
    <svg viewBox={tone === "tile" ? TILE_BOX : "-2 6 119 88"} className={className} aria-hidden focusable="false">
      {tone === "tile" && <rect x="-12" y="-4" width="139" height="108" rx="14" fill="#C6F34A" />}
      <path d={D_PATH} fill={c.d} />
      {[TAIL, PULSE].map((pts) => (
        <polygon key={pts.length} points={pts} fill={c.halo} stroke={c.halo} strokeWidth={3.2} strokeLinejoin="round" />
      ))}
      <polygon points={TAIL} fill={c.pulse} />
      <polygon points={PULSE} fill={c.pulse} />
    </svg>
  );
}

/** Вордмарк строкой — для шапки админки и экрана входа (контракт движка, см. docs/ENGINE.md). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-brand tracking-wide ${className}`}>
      DOCCAR<span className="text-volt">.PRO</span>
    </span>
  );
}

export function Logo({
  tagline = "Автосервис Одинцово",
  size = "md",
  className = "",
}: {
  tagline?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <span className={`inline-flex items-center ${lg ? "gap-3.5" : "gap-2.5"} ${className}`}>
      <LogoMark className={lg ? "h-11 w-auto" : "h-8 w-auto"} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-brand font-extrabold tracking-[0.01em] text-white ${
            lg ? "text-[26px]" : "text-[19px]"
          }`}
        >
          DOCCAR<span className="text-volt">.PRO</span>
        </span>
        {tagline && (
          <span
            className={`mt-1 font-medium uppercase text-frost/50 ${
              lg ? "text-[9.5px] tracking-[0.42em]" : "text-[7.5px] tracking-[0.38em]"
            }`}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
