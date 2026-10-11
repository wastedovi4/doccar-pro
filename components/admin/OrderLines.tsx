"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { LineKind, WorkOrderLine } from "@/lib/crm-types";
import { formatQty, lineAmount, rub, rubInput } from "@/lib/format";

type Suggestion = { name: string; article: string; unit: string; price?: number };

const cell = "rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-graphite hover:border-line focus:border-accent focus:bg-white focus:outline-none";

/**
 * Таблица работ или запчастей наряда. Правка — прямо в строке (сохранение при
 * уходе из поля), добавление — строкой внизу с подсказками из прошлых нарядов.
 * Менеджер видит и ставит цены; механик — без цен и сумм.
 */
export function OrderLines({
  orderId,
  kind,
  lines,
  manager,
  locked,
  onChange,
  onError,
}: {
  orderId: string;
  kind: LineKind;
  lines: WorkOrderLine[];
  manager: boolean;
  locked: boolean;
  onChange: () => void;
  onError: (msg: string) => void;
}) {
  const isPart = kind === "part";
  const own = lines.filter((l) => l.kind === kind);

  async function patch(line: WorkOrderLine, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/orders/${orderId}/lines/${line.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) onError(d?.error || "Не удалось сохранить");
    onChange();
  }

  async function remove(line: WorkOrderLine) {
    if (!confirm(`Удалить «${line.name}»?`)) return;
    const res = await fetch(`/api/admin/orders/${orderId}/lines/${line.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) onError(d?.error || "Не удалось удалить");
    onChange();
  }

  const total = own.reduce((s, l) => s + (l.source === "client" ? 0 : lineAmount(l.qty, l.price)), 0);

  return (
    <div>
      {/* Прокрутка — только у таблицы: выпадающие подсказки строки добавления не обрезаются. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="w-8 py-2 pl-2">№</th>
              <th className="py-2 pl-2">{isPart ? "Запчасть / материал" : "Работа"}</th>
              {isPart && <th className="w-32 py-2 pl-2">Артикул</th>}
              <th className="w-20 py-2 pl-2">{isPart ? "Кол-во" : "Н/ч"}</th>
              <th className="w-16 py-2 pl-2">Ед.</th>
              {manager && <th className="w-28 py-2 pl-2 text-right">Цена</th>}
              {manager && <th className="w-28 py-2 pr-2 text-right">Сумма</th>}
              {!locked && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {own.map((l, i) => (
              <tr key={l.id} className="border-b border-line/70 align-top">
                <td className="py-1.5 pl-2 pt-3 text-xs text-muted">{i + 1}</td>
                <td className="py-1">
                  <EditCell value={l.name} disabled={locked} onSave={(v) => patch(l, { name: v })} />
                  {isPart && (
                    <label className="ml-2 inline-flex items-center gap-1.5 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={l.source === "client"}
                        disabled={locked}
                        onChange={(e) => patch(l, { source: e.target.checked ? "client" : "service" })}
                      />
                      запчасть клиента
                    </label>
                  )}
                </td>
                {isPart && (
                  <td className="py-1">
                    <EditCell value={l.article} disabled={locked} onSave={(v) => patch(l, { article: v })} mono />
                  </td>
                )}
                <td className="py-1">
                  <EditCell value={formatQty(l.qty)} disabled={locked} onSave={(v) => patch(l, { qty: v })} />
                </td>
                <td className="py-1">
                  <EditCell value={l.unit} disabled={locked} onSave={(v) => patch(l, { unit: v })} />
                </td>
                {manager && (
                  <td className="py-1 text-right">
                    {l.source === "client" ? (
                      <span className="inline-block px-2 py-1.5 text-xs text-muted">—</span>
                    ) : (
                      <EditCell
                        value={rubInput(l.price)}
                        placeholder="цена"
                        disabled={locked}
                        warn={l.price === undefined}
                        onSave={(v) => patch(l, { price: v })}
                        right
                      />
                    )}
                  </td>
                )}
                {manager && (
                  <td className="py-1.5 pr-2 pt-3 text-right font-medium text-graphite">
                    {l.source === "client" ? "" : l.price === undefined ? <span className="text-amber-600">нет цены</span> : rub(lineAmount(l.qty, l.price))}
                  </td>
                )}
                {!locked && (
                  <td className="py-1 pt-2 text-right">
                    <button onClick={() => remove(l)} aria-label="Удалить" className="p-1 text-muted hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {own.length === 0 && (
              <tr>
                <td colSpan={8} className="py-3 pl-2 text-sm text-muted">
                  {isPart ? "Запчастей пока нет." : "Работ пока нет."}
                </td>
              </tr>
            )}
          </tbody>
          {manager && own.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={isPart ? 6 : 5} className="py-2 pr-2 text-right text-xs uppercase tracking-wide text-muted">
                  Итого {isPart ? "запчасти" : "работы"}
                </td>
                <td className="py-2 pr-2 text-right font-bold text-graphite">{rub(total)}</td>
                {!locked && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {!locked && <AddLine orderId={orderId} kind={kind} manager={manager} onAdded={onChange} onError={onError} />}
    </div>
  );
}

/** Ячейка, которая выглядит как текст и сохраняется при уходе из поля. */
function EditCell({
  value,
  onSave,
  disabled,
  placeholder,
  warn,
  mono,
  right,
}: {
  value: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  warn?: boolean;
  mono?: boolean;
  right?: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (disabled) {
    return <span className={`block px-2 py-1.5 ${mono ? "font-mono text-xs" : ""} ${right ? "text-right" : ""}`}>{value || "—"}</span>;
  }
  return (
    <input
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() !== value && onSave(v.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`${cell} w-full ${mono ? "font-mono text-xs" : ""} ${right ? "text-right" : ""} ${warn ? "border-amber-300 bg-amber-50" : ""}`}
    />
  );
}

/** Строка добавления с подсказками названий. */
function AddLine({
  orderId,
  kind,
  manager,
  onAdded,
  onError,
}: {
  orderId: string;
  kind: LineKind;
  manager: boolean;
  onAdded: () => void;
  onError: (msg: string) => void;
}) {
  const isPart = kind === "part";
  const empty = { name: "", article: "", qty: "1", unit: isPart ? "шт" : "н/ч", price: "", client: false };
  const [f, setF] = useState(empty);
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (f.name.trim().length < 2) return setSugs([]);
    const t = setTimeout(async () => {
      const d = await (await fetch(`/api/admin/orders/suggest?kind=${kind}&q=${encodeURIComponent(f.name)}`)).json();
      if (d.ok) setSugs(d.items.filter((s: Suggestion) => s.name.toLowerCase() !== f.name.trim().toLowerCase()));
    }, 200);
    return () => clearTimeout(t);
  }, [f.name, kind]);

  function pick(s: Suggestion) {
    setF({ ...f, name: s.name, article: s.article || f.article, unit: s.unit || f.unit, price: s.price !== undefined ? rubInput(s.price) : f.price });
    setSugs([]);
  }

  async function add() {
    if (!f.name.trim()) return nameRef.current?.focus();
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${orderId}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        name: f.name,
        article: f.article,
        qty: f.qty,
        unit: f.unit,
        price: manager && f.price ? f.price : undefined,
        source: isPart && f.client ? "client" : "service",
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return onError(d?.error || "Не удалось добавить");
    setF(empty);
    setSugs([]);
    onAdded();
    nameRef.current?.focus();
  }

  const input = "rounded-md border border-line bg-white px-2 py-1.5 text-sm text-graphite focus:outline-none focus:ring-2 focus:ring-accent";
  return (
    <div className="mt-2 flex flex-wrap items-start gap-2 rounded-lg bg-mist/60 p-2">
      <div className="relative min-w-[220px] flex-1">
        <input
          ref={nameRef}
          className={`${input} w-full`}
          value={f.name}
          placeholder={isPart ? "Добавить запчасть…" : "Добавить работу…"}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        {sugs.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-white shadow-lg">
            {sugs.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-mist"
                >
                  <span className="text-graphite">{s.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {[s.article, s.price !== undefined ? rub(s.price) : ""].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {isPart && (
        <input className={`${input} w-32 font-mono text-xs`} value={f.article} placeholder="артикул" onChange={(e) => setF({ ...f, article: e.target.value })} />
      )}
      <input className={`${input} w-16`} value={f.qty} inputMode="decimal" onChange={(e) => setF({ ...f, qty: e.target.value })} aria-label="Количество" />
      <input className={`${input} w-14`} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} aria-label="Единица" />
      {manager && !(isPart && f.client) && (
        <input
          className={`${input} w-24 text-right`}
          value={f.price}
          inputMode="decimal"
          placeholder={isPart ? "цена" : "по н/ч"}
          onChange={(e) => setF({ ...f, price: e.target.value })}
        />
      )}
      {isPart && (
        <label className="inline-flex items-center gap-1.5 self-center text-xs text-muted">
          <input type="checkbox" checked={f.client} onChange={(e) => setF({ ...f, client: e.target.checked })} />
          клиента
        </label>
      )}
      <button onClick={add} disabled={busy} className="btn-primary min-h-[34px] px-3 py-1.5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        Добавить
      </button>
    </div>
  );
}
