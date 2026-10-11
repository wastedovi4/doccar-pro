"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Search, UserPlus, Users } from "lucide-react";
import type { ClientListItem } from "@/lib/crm-types";
import { Modal, Label, crmInput, fmtDate } from "@/components/admin/ui";

/** Клиенты: поиск по имени, телефону, госномеру, VIN + создание. */
export function ClientsBoard() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const d = await (await fetch(`/api/admin/clients?q=${encodeURIComponent(q)}`)).json();
      if (alive && d.ok) setClients(d.clients);
      if (alive) setLoading(false);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-graphite">Клиенты</h1>
        <button onClick={() => setCreating(true)} className="btn-primary min-h-[38px] py-2">
          <UserPlus className="h-4 w-4" aria-hidden /> Клиент
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          className={`${crmInput} py-2.5 pl-9`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Имя, телефон, госномер или VIN"
          autoFocus
        />
      </div>

      {loading && clients.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Загрузка…
        </p>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-muted">
          <Users className="mx-auto mb-2 h-6 w-6" aria-hidden />
          {q ? "Никого не нашли." : "Клиентов пока нет — они появляются при приёмке автомобиля."}
        </div>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/clients/${c.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-white px-4 py-3 transition-colors hover:border-accent/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-graphite">{c.name}</span>
                  <span className="block truncate text-xs text-muted">{c.phone || "без телефона"}</span>
                </span>
                <span className="min-w-0 max-w-xs truncate text-xs text-muted">
                  {c.vehicles.join(", ") || "машин нет"}
                </span>
                <span className="w-40 text-right text-xs text-muted">
                  {c.orders ? `визитов: ${c.orders} · ${fmtDate(c.lastVisit, false)}` : "визитов не было"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && <ClientCreateModal onClose={() => setCreating(false)} onCreated={(id) => router.push(`/admin/clients/${id}`)} />}
    </div>
  );
}

function ClientCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ text: string; existingId?: string } | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email }),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) onCreated(d.client.id);
    else setError({ text: d.error || "Не удалось создать", existingId: d.existingId });
  }

  return (
    <Modal
      title="Новый клиент"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-outline-light">
            Отмена
          </button>
          <button onClick={submit} disabled={saving} className="btn-primary disabled:opacity-70">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Создать
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <Label required>Имя</Label>
          <input className={crmInput} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="block">
          <Label>Телефон</Label>
          <input className={crmInput} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
        </label>
        <label className="block">
          <Label>E-mail</Label>
          <input className={crmInput} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error.text}
            {error.existingId && (
              <>
                {" "}
                — <Link href={`/admin/clients/${error.existingId}`} className="font-semibold underline">открыть его карточку</Link>
              </>
            )}
          </p>
        )}
      </div>
    </Modal>
  );
}
