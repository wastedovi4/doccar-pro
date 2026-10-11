"use client";

import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Copy, KeyRound, Loader2, ShieldOff } from "lucide-react";
import { fmtDate } from "@/components/admin/ui";

type Access = { active: boolean; issuedAt?: string; lastSeenAt?: string };

/**
 * Доступ клиента в личный кабинет: выдать персональную ссылку (показывается
 * один раз — копия или QR на экране), выдать новую (старые гаснут), отозвать.
 */
export function ClientAccess({ clientId }: { clientId: string }) {
  const [access, setAccess] = useState<Access | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clients/${clientId}/access`)
      .then((r) => r.json())
      .then((d) => d.ok && setAccess(d.access));
  }, [clientId]);

  const qr = useMemo(() => {
    if (!url) return "";
    const q = qrcode(0, "M");
    q.addData(url);
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [url]);

  async function issue() {
    if (access?.active && !confirm("Выдать новую ссылку? Прежняя перестанет работать, клиент выйдет из кабинета.")) return;
    setBusy(true);
    const d = await (await fetch(`/api/admin/clients/${clientId}/access`, { method: "POST" })).json();
    setBusy(false);
    if (d.ok) {
      setUrl(d.url);
      setAccess(d.access);
      setCopied(false);
    }
  }

  async function revoke() {
    if (!confirm("Отозвать доступ в личный кабинет?")) return;
    setBusy(true);
    const d = await (await fetch(`/api/admin/clients/${clientId}/access`, { method: "DELETE" })).json();
    setBusy(false);
    if (d.ok) {
      setAccess(d.access);
      setUrl("");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* буфер недоступен — ссылка видна в поле */
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted">Личный кабинет</h2>
      <p className="text-sm text-muted">
        {access === null
          ? "…"
          : access.active
            ? `Доступ выдан ${fmtDate(access.issuedAt)}${access.lastSeenAt ? ` · последний вход ${fmtDate(access.lastSeenAt)}` : " · ещё не входил"}`
            : "Доступ не выдан. Клиент увидит машины, историю, отчёты и рекомендации, сможет записаться."}
      </p>

      {url && (
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <div className="text-xs font-medium text-accent">Ссылка показывается один раз — отправьте её клиенту или дайте отсканировать QR.</div>
          <div className="mt-2 flex gap-2">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1.5 font-mono text-xs" />
            <button onClick={copy} className="btn-outline-light min-h-[32px] px-3 py-1 text-xs">
              <Copy className="h-3.5 w-3.5" aria-hidden /> {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          <div className="mx-auto mt-3 h-40 w-40 rounded bg-white [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={issue} disabled={busy} className="btn-primary min-h-[36px] px-3 py-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
          {access?.active ? "Новая ссылка" : "Выдать ссылку"}
        </button>
        {access?.active && (
          <button onClick={revoke} disabled={busy} className="btn-outline-light min-h-[36px] px-3 py-1.5">
            <ShieldOff className="h-4 w-4" aria-hidden /> Отозвать
          </button>
        )}
      </div>
    </div>
  );
}
