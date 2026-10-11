"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { BOOKING_HREF } from "@/lib/site";

/**
 * Окно записи на сервис. Открывается любой ссылкой href="#booking"
 * (делегирование кликов), прямым заходом по /#booking и сменой хэша.
 * data-service на ссылке подставляет услугу в форму.
 * Нативный <dialog>: фокус-ловушка, Esc и inert-фон — средствами браузера.
 */
export function BookingDialog({ services }: { services: string[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [service, setService] = useState("");
  // Новый ключ на каждое открытие — форма стартует с чистого листа.
  const [session, setSession] = useState(0);

  const open = useCallback((preset = "") => {
    const dlg = ref.current;
    if (!dlg) return;
    setService(preset);
    if (!dlg.open) {
      setSession((s) => s + 1);
      dlg.showModal();
      document.documentElement.style.overflow = "hidden";
    }
  }, []);

  const close = useCallback(() => ref.current?.close(), []);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.(`a[href="${BOOKING_HREF}"]`);
      if (!a) return;
      e.preventDefault();
      open(a.getAttribute("data-service") ?? "");
    };
    const onHash = () => {
      if (location.hash === BOOKING_HREF) open();
    };
    const onClose = () => {
      document.documentElement.style.overflow = "";
      if (location.hash === BOOKING_HREF) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    };

    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", onHash);
    dlg.addEventListener("close", onClose);
    onHash();
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", onHash);
      dlg.removeEventListener("close", onClose);
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="booking-title"
      // Клик по подложке (вне карточки) закрывает окно.
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto w-[min(100%-1.5rem,32rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-coal p-0 text-frost shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-fade-up"
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-frost/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <ContactForm key={session} services={services} presetService={service} onDone={close} />
      </div>
    </dialog>
  );
}
