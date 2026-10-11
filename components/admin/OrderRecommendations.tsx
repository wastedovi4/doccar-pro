"use client";

import { useState } from "react";
import { Check, Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import {
  REC_PRIORITY_LABEL,
  REC_STATUS_LABEL,
  type RecPriority,
  type Recommendation,
} from "@/lib/crm-types";
import { rub, woNumber } from "@/lib/format";
import { fmtDate } from "@/components/admin/ui";

const PRIORITY_CLS: Record<RecPriority, string> = {
  urgent: "bg-red-50 text-red-700",
  soon: "bg-amber-50 text-amber-700",
  later: "bg-sky-50 text-sky-700",
};

export function PriorityChip({ p }: { p: RecPriority }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLS[p]}`}>{REC_PRIORITY_LABEL[p]}</span>;
}

/**
 * Рекомендации клиенту: открытые с прошлых визитов по этой машине (можно
 * отметить «выполнено в этом наряде» или «отказ») и новые — из этого наряда.
 */
export function OrderRecommendations({
  orderId,
  carried,
  own,
  manager,
  locked,
  onChange,
  onError,
}: {
  orderId: string;
  carried: Recommendation[];
  own: Recommendation[];
  manager: boolean;
  locked: boolean;
  onChange: () => void;
  onError: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<RecPriority>("soon");
  const [estimate, setEstimate] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) onError(d?.error || "Не удалось сохранить");
    onChange();
    return res.ok;
  }

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    const okay = await call(`/api/admin/orders/${orderId}/recommendations`, "POST", {
      text,
      priority,
      estimate: manager ? estimate : undefined,
    });
    setBusy(false);
    if (okay) {
      setText("");
      setEstimate("");
    }
  }

  const select = "rounded-md border border-line bg-white px-2 py-1.5 text-sm text-graphite focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="space-y-4">
      {carried.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">С прошлых визитов</div>
          <ul className="space-y-2">
            {carried.map((r) => {
              const doneHere = r.status === "done" && r.resolvedOrderId === orderId;
              return (
                <li key={r.id} className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${doneHere ? "border-emerald-200 bg-emerald-50/60" : "border-line"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityChip p={r.priority} />
                      <span className={`text-sm ${doneHere ? "text-muted line-through" : "text-graphite"}`}>{r.text}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {r.orderNumber ? `${woNumber(r.orderNumber)} · ` : ""}
                      {fmtDate(r.createdAt, false)}
                      {r.estimate !== undefined && ` · ориентир ${rub(r.estimate)}`}
                      {doneHere && " · выполнена в этом наряде"}
                    </div>
                  </div>
                  {!locked && (
                    <div className="flex gap-1.5">
                      {doneHere ? (
                        <button
                          onClick={() => call(`/api/admin/recommendations/${r.id}`, "PATCH", { status: "open" })}
                          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent"
                          disabled={!manager}
                          title={manager ? "Вернуть в открытые" : "Вернуть может приёмщик"}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Вернуть
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => call(`/api/admin/recommendations/${r.id}`, "PATCH", { status: "done", resolvedOrderId: orderId })}
                            className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/5 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10"
                          >
                            <Check className="h-3.5 w-3.5" /> Выполнено здесь
                          </button>
                          {manager && (
                            <button
                              onClick={() => call(`/api/admin/recommendations/${r.id}`, "PATCH", { status: "declined" })}
                              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-red-300 hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" /> Отказ
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Рекомендации по этому визиту</div>
        {own.length === 0 ? (
          <p className="text-sm text-muted">Пока нет. Они попадут в отчёт клиенту и напомнят о себе при следующем визите.</p>
        ) : (
          <ul className="space-y-2">
            {own.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-line p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityChip p={r.priority} />
                    <span className="text-sm text-graphite">{r.text}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {r.estimate !== undefined && `ориентир ${rub(r.estimate)} · `}
                    {REC_STATUS_LABEL[r.status]}
                  </div>
                </div>
                {!locked && (
                  <button
                    onClick={() => confirm("Удалить рекомендацию?") && call(`/api/admin/recommendations/${r.id}`, "DELETE")}
                    aria-label="Удалить"
                    className="p-1 text-muted hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!locked && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-mist/60 p-2">
            <input
              className={`${select} min-w-[240px] flex-1`}
              value={text}
              placeholder="Например: заменить задние колодки через 3 000 км"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <select className={select} value={priority} onChange={(e) => setPriority(e.target.value as RecPriority)} aria-label="Приоритет">
              {(Object.keys(REC_PRIORITY_LABEL) as RecPriority[]).map((p) => (
                <option key={p} value={p}>
                  {REC_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
            {manager && (
              <input className={`${select} w-28 text-right`} value={estimate} inputMode="decimal" placeholder="ориентир ₽" onChange={(e) => setEstimate(e.target.value)} />
            )}
            <button onClick={add} disabled={busy} className="btn-primary min-h-[34px] px-3 py-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              Добавить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
