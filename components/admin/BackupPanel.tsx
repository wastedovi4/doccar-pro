"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";

export function BackupPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function restore() {
    if (!file) return;
    if (!confirm("Восстановление заменит ВСЕ текущие данные (контент сайта + запросы, записи, сотрудники). Продолжить?")) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: buf,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Ошибка восстановления");
      setMsg({ type: "ok", text: "Данные восстановлены из бэкапа." });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Ошибка" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-graphite">Резервное копирование</h1>
      <p className="mb-6 text-sm text-muted">
        Полный бэкап данных: контент сайта, запросы, записи календаря и сотрудники — одним архивом.
      </p>

      {msg && (
        <div
          className={`mb-5 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
            msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {msg.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Скачать */}
        <div className="rounded-xl border border-line bg-white p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Download className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="mt-3 text-base font-bold text-graphite">Скачать бэкап</h2>
          <p className="mt-1 text-sm text-muted">
            Сохранит ZIP-архив со всеми данными на ваш компьютер. Делайте это регулярно.
          </p>
          <a href="/api/admin/backup" download className="btn-primary mt-4">
            <Download className="h-4 w-4" aria-hidden /> Скачать архив (.zip)
          </a>
        </div>

        {/* Восстановить */}
        <div className="rounded-xl border border-line bg-white p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Upload className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="mt-3 text-base font-bold text-graphite">Восстановить из бэкапа</h2>
          <p className="mt-1 text-sm text-muted">
            Загрузите ранее скачанный ZIP. Текущие данные будут заменены.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-4 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-mist file:px-4 file:py-2 file:text-sm file:font-medium file:text-graphite hover:file:bg-line"
          />

          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Восстановление перезапишет все данные, включая учётки сотрудников. После него, возможно, придётся войти заново.
          </div>

          <button onClick={restore} disabled={!file || busy} className="btn-outline-light mt-3 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            Восстановить
          </button>
        </div>
      </div>
    </div>
  );
}
