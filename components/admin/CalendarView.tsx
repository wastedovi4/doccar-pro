"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import type { Appointment, ApptStatus, Role } from "@/lib/crm-types";
import type { Content } from "@/lib/content-model";
import { AppointmentModal, type StaffLite } from "@/components/admin/AppointmentModal";

const HOUR_H = 48;
const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const COLORS = ["#008BD9", "#7c3aed", "#059669", "#d97706", "#db2777", "#0891b2", "#ca8a04", "#dc2626"];
const STATUS_LABEL: Record<ApptStatus, string> = {
  scheduled: "Запланирована",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function hm(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Раскладка пересекающихся записей по «дорожкам». */
function computeLanes(items: Appointment[]): Map<string, { lane: number; count: number }> {
  const res = new Map<string, { lane: number; count: number }>();
  const withTimes = items
    .map((a) => ({ a, start: new Date(a.start).getTime(), end: new Date(a.start).getTime() + a.durationMin * 60000 }))
    .sort((x, y) => x.start - y.start);

  let cluster: typeof withTimes = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();
    for (const it of cluster) {
      let idx = laneEnds.findIndex((e) => e <= it.start);
      if (idx === -1) {
        idx = laneEnds.length;
        laneEnds.push(it.end);
      } else laneEnds[idx] = it.end;
      laneOf.set(it.a.id, idx);
    }
    const count = laneEnds.length;
    for (const it of cluster) res.set(it.a.id, { lane: laneOf.get(it.a.id)!, count });
    cluster = [];
  };

  for (const it of withTimes) {
    if (cluster.length === 0) {
      cluster = [it];
      clusterEnd = it.end;
    } else if (it.start < clusterEnd) {
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.end);
    } else {
      flush();
      cluster = [it];
      clusterEnd = it.end;
    }
  }
  if (cluster.length) flush();
  return res;
}

export function CalendarView({
  role,
  userId,
  workHours,
}: {
  role: Role;
  userId: string;
  workHours: Content["workHours"];
}) {
  const manager = role === "admin" || role === "receiver";
  const isWorkingDay = (d: Date) => workHours.days[(d.getDay() + 6) % 7];
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "day">("week");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [mechFilter, setMechFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [defaults, setDefaults] = useState<{ date?: string; time?: string; mechanicId?: string }>({});
  const [hover, setHover] = useState<{ a: Appointment; x: number; y: number } | null>(null);
  // Тултип-превью — только для мыши (на тач-экранах наведение = тап, не нужно).
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover)").matches);
  }, []);

  async function load() {
    const [ar, sr] = await Promise.all([
      fetch("/api/admin/appointments").then((r) => r.json()),
      fetch("/api/admin/staff").then((r) => r.json()),
    ]);
    if (ar.ok) setAppointments(ar.appointments);
    if (sr.ok) setStaff(sr.staff);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 20000); // авто-обновление
    return () => clearInterval(t);
  }, []);

  const mechanics = useMemo(() => staff.filter((s) => s.role === "mechanic"), [staff]);
  const mechColor = (id?: string) => {
    if (!id) return "#94a3b8";
    const i = mechanics.findIndex((m) => m.id === id);
    return i >= 0 ? COLORS[i % COLORS.length] : "#94a3b8";
  };
  const mechName = (id?: string) => mechanics.find((m) => m.id === id)?.name;

  const inWeek = useMemo(() => {
    const ws = startOfWeek(cursor);
    return { ws, we: addDays(ws, 7) };
  }, [cursor]);

  const filtered = (list: Appointment[]) =>
    mechFilter ? list.filter((a) => a.mechanicId === mechFilter) : list;

  function openCreate(date?: Date, time?: string, mechanicId?: string) {
    setHover(null); // убрать тултип, иначе он зависнет поверх модалки
    setEditing(null);
    setDefaults({
      date: date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : undefined,
      time,
      mechanicId,
    });
    setModalOpen(true);
  }
  function openEdit(a: Appointment) {
    setHover(null); // убрать тултип, иначе он зависнет поверх модалки
    setEditing(a);
    setModalOpen(true);
  }

  function timeFromClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let m = hourStart * 60 + (y / HOUR_H) * 60;
    m = Math.max(hourStart * 60, Math.min(hourEnd * 60 - 15, Math.round(m / 15) * 15));
    return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  }

  const step = view === "week" ? 7 : 1;
  const label =
    view === "week"
      ? `${inWeek.ws.getDate()} ${MONTHS[inWeek.ws.getMonth()]} — ${addDays(inWeek.ws, 6).getDate()} ${MONTHS[addDays(inWeek.ws, 6).getMonth()]}`
      : `${DAY_NAMES[(cursor.getDay() + 6) % 7]}, ${cursor.getDate()} ${MONTHS[cursor.getMonth()]}`;

  // Границы сетки = рабочие часы, но расширяем, чтобы показать записи вне часов.
  const { hourStart, hourEnd } = useMemo(() => {
    let start = workHours.start;
    let end = workHours.end;
    for (const a of appointments) {
      const s = new Date(a.start);
      start = Math.min(start, s.getHours());
      end = Math.max(end, Math.ceil((s.getHours() * 60 + s.getMinutes() + a.durationMin) / 60));
    }
    start = Math.max(0, start);
    end = Math.min(24, end);
    if (end <= start) end = start + 1;
    return { hourStart: start, hourEnd: end };
  }, [appointments, workHours]);

  const hourLines = Array.from({ length: hourEnd - hourStart }, (_, h) => h);
  const gridH = (hourEnd - hourStart) * HOUR_H;

  // Затенение нерабочих часов (сверху и снизу от рабочего окна).
  function OffHours() {
    const topH = Math.max(0, (workHours.start - hourStart) * HOUR_H);
    const botTop = (Math.min(workHours.end, hourEnd) - hourStart) * HOUR_H;
    const botH = Math.max(0, gridH - botTop);
    const stripe =
      "repeating-linear-gradient(45deg, rgba(100,116,139,0.06) 0 6px, transparent 6px 12px)";
    return (
      <>
        {topH > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: topH, background: stripe }} />
        )}
        {botH > 0 && (
          <div className="pointer-events-none absolute inset-x-0" style={{ top: botTop, height: botH, background: stripe }} />
        )}
      </>
    );
  }

  function ApptBlock({ a, lane, count }: { a: Appointment; lane: number; count: number }) {
    const s = new Date(a.start);
    const top = Math.max(0, (s.getHours() - hourStart + s.getMinutes() / 60) * HOUR_H);
    const height = Math.max(22, (a.durationMin / 60) * HOUR_H - 2);
    const width = 100 / count;
    const done = a.status === "done";
    const cancelled = a.status === "cancelled";
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          openEdit(a);
        }}
        onMouseEnter={(e) => {
          if (!canHover || modalOpen) return;
          e.stopPropagation();
          setHover({ a, x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          if (!canHover || modalOpen) return;
          e.stopPropagation();
          setHover({ a, x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => setHover(null)}
        className="absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight text-white ring-1 ring-black/10"
        style={{
          top,
          height,
          left: `calc(${lane * width}% + 1px)`,
          width: `calc(${width}% - 2px)`,
          backgroundColor: mechColor(a.mechanicId),
          opacity: cancelled ? 0.45 : done ? 0.75 : 1,
          textDecoration: cancelled ? "line-through" : undefined,
        }}
      >
        <div className="font-semibold">
          {hm(s)} {a.clientName}
        </div>
        {height > 32 && <div className="truncate opacity-90">{a.service || a.car || "визит"}</div>}
      </button>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-graphite">
          {role === "mechanic" ? "Мои работы" : "Календарь"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Переключатель вида */}
          <div className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 font-medium ${view === v ? "bg-accent text-on-accent" : "text-muted"}`}
              >
                {v === "day" ? "День" : "Неделя"}
              </button>
            ))}
          </div>

          {manager && mechanics.length > 0 && (
            <select
              value={mechFilter}
              onChange={(e) => setMechFilter(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Все механики</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-0.5">
            <button onClick={() => setCursor(addDays(cursor, -step))} className="rounded-md p-1.5 hover:bg-mist" aria-label="Назад">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                setCursor(d);
              }}
              className="rounded-md px-2 py-1 text-sm font-medium hover:bg-mist"
            >
              Сегодня
            </button>
            <button onClick={() => setCursor(addDays(cursor, step))} className="rounded-md p-1.5 hover:bg-mist" aria-label="Вперёд">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {manager && (
            <button onClick={() => openCreate(view === "day" ? cursor : new Date())} className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden /> Запись
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 text-sm font-medium capitalize text-muted">{label}</div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
        </div>
      ) : view === "week" ? (
        <WeekGrid />
      ) : (
        <DayGrid />
      )}

      {/* Легенда */}
      {mechanics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          {mechanics.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mechColor(m.id) }} />
              {m.name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> без механика
          </span>
        </div>
      )}

      {/* Тултип при наведении */}
      {hover && <HoverCard a={hover.a} x={hover.x} y={hover.y} mechName={mechName(hover.a.mechanicId)} />}

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        staff={staff}
        initial={editing}
        restricted={!manager}
        defaultDate={defaults.date}
        defaultTime={defaults.time}
        defaultMechanicId={defaults.mechanicId}
        workHours={workHours}
      />
    </div>
  );

  /* ---- недельная сетка ---- */
  function WeekGrid() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(inWeek.ws, i));
    const today = new Date();
    return (
      <div
        className="overflow-x-auto rounded-xl border border-line bg-white"
        onMouseLeave={() => setHover(null)}
        onScroll={() => setHover(null)}
      >
        <div className="min-w-[760px]">
          <div className="grid border-b border-line" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div />
            {days.map((d, i) => {
              const t = sameDay(d, today);
              return (
                <div key={i} className={`border-l border-line px-2 py-2 text-center ${t ? "bg-accent/5" : ""}`}>
                  <div className="text-xs font-medium text-muted">{DAY_NAMES[i]}</div>
                  <div className={`text-sm font-bold ${t ? "text-accent" : "text-graphite"}`}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <TimeGutter />
            {days.map((d, i) => {
              const dayAppts = filtered(appointments).filter((a) => sameDay(new Date(a.start), d));
              const lanes = computeLanes(dayAppts);
              return (
                <div
                  key={i}
                  onClick={(e) => manager && openCreate(d, timeFromClick(e))}
                  onMouseMove={() => setHover(null)}
                  className={`relative border-l border-line ${manager ? "cursor-pointer" : ""} ${
                    !isWorkingDay(d) ? "bg-slate-50/70" : ""
                  }`}
                  style={{ height: gridH }}
                >
                  <OffHours />
                  {hourLines.map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-line/60" style={{ top: h * HOUR_H }} />
                  ))}
                  {dayAppts.map((a) => {
                    const l = lanes.get(a.id)!;
                    return <ApptBlock key={a.id} a={a} lane={l.lane} count={l.count} />;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ---- дневная сетка: колонки по механикам ---- */
  function DayGrid() {
    // Колонки: каждый механик + «без механика» (только для менеджеров).
    const cols = manager
      ? [...mechanics.filter((m) => !mechFilter || m.id === mechFilter), { id: "", name: "Без механика", role: "mechanic" }]
      : mechanics.filter((m) => m.id === userId);
    const dayAppts = appointments.filter((a) => sameDay(new Date(a.start), cursor));

    return (
      <div
        className="overflow-x-auto rounded-xl border border-line bg-white"
        onMouseLeave={() => setHover(null)}
        onScroll={() => setHover(null)}
      >
        <div style={{ minWidth: 56 + cols.length * 120 }}>
          <div className="grid border-b border-line" style={{ gridTemplateColumns: `56px repeat(${cols.length}, minmax(120px, 1fr))` }}>
            <div />
            {cols.map((c) => (
              <div key={c.id || "none"} className="border-l border-line px-2 py-2 text-center">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-graphite">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mechColor(c.id || undefined) }} />
                  {c.name}
                </span>
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${cols.length}, minmax(120px, 1fr))` }}>
            <TimeGutter />
            {cols.map((c) => {
              const colAppts = dayAppts.filter((a) => (a.mechanicId ?? "") === c.id);
              const lanes = computeLanes(colAppts);
              return (
                <div
                  key={c.id || "none"}
                  onClick={(e) => manager && openCreate(cursor, timeFromClick(e), c.id || undefined)}
                  onMouseMove={() => setHover(null)}
                  className={`relative border-l border-line ${manager ? "cursor-pointer" : ""} ${
                    !isWorkingDay(cursor) ? "bg-slate-50/70" : ""
                  }`}
                  style={{ height: gridH }}
                >
                  <OffHours />
                  {hourLines.map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-line/60" style={{ top: h * HOUR_H }} />
                  ))}
                  {colAppts.map((a) => {
                    const l = lanes.get(a.id)!;
                    return <ApptBlock key={a.id} a={a} lane={l.lane} count={l.count} />;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function TimeGutter() {
    return (
      <div className="relative" style={{ height: gridH }} onMouseMove={() => setHover(null)}>
        {hourLines.map((h) => (
          <div key={h} className="absolute right-1.5 -translate-y-1/2 text-xs text-muted" style={{ top: h * HOUR_H }}>
            {hourStart + h}:00
          </div>
        ))}
      </div>
    );
  }
}

/* ---- карточка при наведении ---- */
function HoverCard({ a, x, y, mechName }: { a: Appointment; x: number; y: number; mechName?: string }) {
  const s = new Date(a.start);
  const e = new Date(s.getTime() + a.durationMin * 60000);
  const left = Math.min(x + 14, (typeof window !== "undefined" ? window.innerWidth : 1000) - 280);
  const top = y + 14;
  return (
    <div
      className="pointer-events-none fixed z-[60] w-64 rounded-lg border border-line bg-white p-3 text-sm shadow-xl"
      style={{ left, top }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-graphite">{a.clientName}</span>
        <span className="text-xs text-muted">
          {pad(s.getHours())}:{pad(s.getMinutes())}–{pad(e.getHours())}:{pad(e.getMinutes())}
        </span>
      </div>
      <dl className="mt-2 space-y-1 text-xs text-muted">
        {a.phone && <Row k="Телефон" v={a.phone} />}
        {a.car && <Row k="Авто" v={a.car} />}
        {a.service && <Row k="Работа" v={a.service} />}
        <Row k="Механик" v={mechName ?? "не назначен"} />
        <Row k="Статус" v={STATUS_LABEL[a.status]} />
        {a.note && <Row k="Заметка" v={a.note} />}
      </dl>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-muted">{k}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium text-graphite">{v}</dd>
    </div>
  );
}
