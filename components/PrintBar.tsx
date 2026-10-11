"use client";

import { Printer } from "lucide-react";

/** Панель над документом: печать. При печати скрыта. */
export function PrintBar({
  title,
  back,
  dark = false,
}: {
  title: string;
  back?: { href: string; label: string };
  dark?: boolean; // над тёмной страницей сайта
}) {
  return (
    <div className="mx-auto mb-4 flex w-full max-w-[794px] items-center justify-between gap-3 px-4 print:hidden sm:px-0">
      <div className={`text-sm ${dark ? "text-frost/70" : "text-neutral-600"}`}>
        {back ? (
          <a href={back.href} className="hover:underline">
            ← {back.label}
          </a>
        ) : (
          title
        )}
      </div>
      <button
        onClick={() => window.print()}
        className={
          dark
            ? "btn-ghost min-h-[40px] py-2"
            : "inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        }
      >
        <Printer className="h-4 w-4" aria-hidden /> Печать / PDF
      </button>
    </div>
  );
}

/** Стили печати: белый фон, A4, без полей браузера сверх нужного. */
export const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff !important; color: #111 !important; }
}
`;
