"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, X, ArrowRight, AlertCircle } from "lucide-react";

/**
 * Запись на сервис из кабинета. Открывается любой кнопкой с data-lk-book;
 * data-vehicle / data-service / data-message подставляют машину и текст
 * (например, из рекомендации мастера). Имя и телефон — из профиля клиента.
 */
export function LkBooking({ vehicles, services }: { vehicles: { id: string; label: string }[]; services: string[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const open = useCallback(
    (preset: { vehicle?: string; service?: string; message?: string }) => {
      setVehicleId(preset.vehicle ?? vehicles[0]?.id ?? "");
      setService(preset.service ?? "");
      setMessage(preset.message ?? "");
      setWhen("");
      setStatus("idle");
      setError("");
      ref.current?.showModal();
      document.documentElement.style.overflow = "hidden";
    },
    [vehicles]
  );

  useEffect(() => {
    const dlg = ref.current;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-lk-book]");
      if (!el) return;
      e.preventDefault();
      open({
        vehicle: el.getAttribute("data-vehicle") ?? undefined,
        service: el.getAttribute("data-service") ?? undefined,
        message: el.getAttribute("data-message") ?? undefined,
      });
    };
    const onClose = () => (document.documentElement.style.overflow = "");
    document.addEventListener("click", onClick);
    dlg?.addEventListener("close", onClose);
    return () => {
      document.removeEventListener("click", onClick);
      dlg?.removeEventListener("close", onClose);
    };
  }, [open]);

  async function submit() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/lk/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicleId || undefined, service, message, when }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Не удалось отправить");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setStatus("error");
    }
  }

  const field =
    "w-full rounded-lg border border-white/10 bg-night px-4 py-3 text-sm text-frost placeholder:text-frost/35 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40";
  const label = "mb-1.5 block text-sm font-medium text-frost/85";

  return (
    <dialog
      ref={ref}
      aria-labelledby="lk-booking-title"
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto w-[min(100%-1.5rem,32rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-coal p-0 text-frost shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Закрыть"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-frost/60 hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        {status === "done" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-accent" aria-hidden />
            <h3 id="lk-booking-title" className="mt-5 font-display text-2xl font-bold text-white">
              Заявка отправлена
            </h3>
            <p className="mt-2 max-w-xs text-sm text-frost/65">Перезвоним и подтвердим время визита.</p>
            <button onClick={() => ref.current?.close()} className="btn-primary mt-7 px-8">
              Готово
            </button>
          </div>
        ) : (
          <>
            <h3 id="lk-booking-title" className="pr-10 font-display text-2xl font-bold text-white">
              Запись на сервис
            </h3>
            <p className="mt-1.5 text-sm text-frost/60">Имя и телефон уже знаем — осталось пару деталей.</p>
            <div className="mt-6 space-y-4">
              {vehicles.length > 0 && (
                <label className="block">
                  <span className={label}>Автомобиль</span>
                  <select className={field} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                    <option value="">Другой автомобиль</option>
                  </select>
                </label>
              )}
              <label className="block">
                <span className={label}>Услуга</span>
                <select className={field} value={service} onChange={(e) => setService(e.target.value)}>
                  <option value="">Выберите</option>
                  {services.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="Другое">Другое</option>
                </select>
              </label>
              <label className="block">
                <span className={label}>Что сделать</span>
                <textarea className={`${field} resize-y`} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <label className="block">
                <span className={label}>Удобное время</span>
                <input className={field} value={when} placeholder="Например: в субботу утром" onChange={(e) => setWhen(e.target.value)} />
              </label>
              {status === "error" && (
                <p className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {error}
                </p>
              )}
              <button onClick={submit} disabled={status === "loading"} className="btn-primary w-full disabled:opacity-70">
                {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Отправить заявку <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
