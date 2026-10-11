"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Phone,
  Car,
  Wrench,
  ChevronDown,
  CheckCircle2,
  Archive,
  CalendarPlus,
  Clock,
  Circle,
} from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/crm-types";
import { AppointmentModal, type StaffLite } from "@/components/admin/AppointmentModal";

const STATUS: Record<LeadStatus, { label: string; cls: string }> = {
  new: { label: "Новый", cls: "bg-accent/10 text-accent" },
  seen: { label: "Просмотрен", cls: "bg-amber-100 text-amber-700" },
  processed: { label: "Обработан", cls: "bg-green-100 text-green-700" },
  archived: { label: "Архив", cls: "bg-gray-100 text-gray-500" },
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RequestsBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [modalLead, setModalLead] = useState<Lead | null>(null);

  async function load() {
    const [lr, sr] = await Promise.all([
      fetch("/api/admin/leads").then((r) => r.json()),
      fetch("/api/admin/staff").then((r) => r.json()),
    ]);
    if (lr.ok) setLeads(lr.leads);
    if (sr.ok) setStaff(sr.staff);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // авто-обновление списка запросов
    return () => clearInterval(t);
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (res.ok) {
      const data = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === id ? data.lead : l)));
    }
  }

  function toggle(lead: Lead) {
    const next = expanded === lead.id ? null : lead.id;
    setExpanded(next);
    if (next && !lead.seenAt) patch(lead.id, { seen: true });
  }

  const visible = leads.filter((l) =>
    filter === "active" ? l.status !== "archived" : true
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-graphite">Запросы</h1>
        <div className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
          <button
            onClick={() => setFilter("active")}
            className={`rounded-md px-3 py-1.5 font-medium ${filter === "active" ? "bg-accent text-on-accent" : "text-muted"}`}
          >
            Активные
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 font-medium ${filter === "all" ? "bg-accent text-on-accent" : "text-muted"}`}
          >
            Все
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Пока нет запросов. Заявки с формы сайта появятся здесь.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((lead) => {
            const st = STATUS[lead.status];
            const isOpen = expanded === lead.id;
            return (
              <li key={lead.id} className="overflow-hidden rounded-xl border border-line bg-white">
                <button
                  onClick={() => toggle(lead)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  {lead.status === "new" ? (
                    <Circle className="h-2.5 w-2.5 shrink-0 fill-accent text-accent" aria-hidden />
                  ) : (
                    <span className="w-2.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-graphite">{lead.name}</span>
                      {lead.clientId && (
                        <a
                          href={`/admin/clients/${lead.clientId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:underline"
                          title="Заявка из личного кабинета — открыть карточку клиента"
                        >
                          из ЛК
                        </a>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </span>
                      {lead.service && (
                        <span className="inline-flex items-center gap-1">
                          <Wrench className="h-3 w-3" /> {lead.service}
                        </span>
                      )}
                      {lead.car && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="h-3 w-3" /> {lead.car}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {fmt(lead.createdAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-line px-4 py-4">
                    {lead.message && (
                      <div className="mb-3 rounded-lg bg-mist p-3 text-sm text-graphite">
                        {lead.message}
                      </div>
                    )}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-muted">
                        Заметка приёмщика
                      </span>
                      <textarea
                        rows={2}
                        defaultValue={lead.note ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (lead.note ?? "")) patch(lead.id, { note: e.target.value });
                        }}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Комментарий по обращению"
                      />
                    </label>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setModalLead(lead)}
                        className="btn-primary"
                        disabled={!!lead.appointmentId}
                        title={lead.appointmentId ? "Запись уже создана" : ""}
                      >
                        <CalendarPlus className="h-4 w-4" aria-hidden />
                        {lead.appointmentId ? "Запись создана" : "Создать запись"}
                      </button>
                      {lead.status !== "processed" && (
                        <button onClick={() => patch(lead.id, { processed: true })} className="btn-outline-light">
                          <CheckCircle2 className="h-4 w-4" aria-hidden /> Обработан
                        </button>
                      )}
                      {lead.status !== "archived" ? (
                        <button onClick={() => patch(lead.id, { status: "archived" })} className="btn-outline-light">
                          <Archive className="h-4 w-4" aria-hidden /> В архив
                        </button>
                      ) : (
                        <button onClick={() => patch(lead.id, { status: "seen" })} className="btn-outline-light">
                          Вернуть из архива
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AppointmentModal
        open={!!modalLead}
        onClose={() => setModalLead(null)}
        onSaved={load}
        staff={staff}
        leadId={modalLead?.id}
        prefill={
          modalLead
            ? { clientName: modalLead.name, phone: modalLead.phone, car: modalLead.car, service: [modalLead.service, modalLead.message].filter(Boolean).join(" — ") }
            : undefined
        }
      />
    </div>
  );
}
