import type { Config } from "tailwindcss";

/** Цвет из CSS-переменной (RGB-триплет) с поддержкой модификатора прозрачности. */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./config/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Бренд-палитра DOCCAR.PRO. Акцент — переменная: на тёмных поверхностях
        // это лайм #C6F34A, в светлой админке — тёмно-оливковый (читаемый на белом).
        // Темы переключаются классами .theme-dark / .theme-light (см. globals.css).
        accent: {
          DEFAULT: v("--accent"),
          hover: v("--accent-hover"),
        },
        "on-accent": v("--on-accent"), // текст/иконки поверх акцентной заливки
        // Фирменный лайм — там, где нужен именно он. Не «lime»: это имя палитры Tailwind
        // (lime-50…900), её использует движок — переопределять стандартные палитры нельзя.
        volt: "#C6F34A",
        night: "#101318", // фон
        coal: "#16191F", // приподнятая поверхность (секции, карточки)
        steel: "#2A2F36", // доп. фон, границы
        frost: "#E8ECEF", // основной текст на тёмном
        // Светлые токены (админка)
        graphite: "#111827",
        muted: "#6B7280",
        mist: "#F5F7FA",
        line: "#E5E7EB",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-display)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "1200px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
