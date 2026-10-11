"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Inbox, CalendarClock, Check } from "lucide-react";
import type { Role } from "@/lib/crm-types";

type FeedLead = { id: string; name: string; car: string; createdAt: string; status: string };
type FeedAppt = { id: string; clientName: string; start: string; status: string; createdAt: string };

type Item = { id: string; title: string; sub: string; createdAt: string; href: string };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

export function NotificationCenter({ role, userId }: { role: Role; userId: string }) {
  const router = useRouter();
  const manager = role === "admin" || role === "receiver";
  const seenKey = `lk_seen_${userId}`;

  const [items, setItems] = useState<Item[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  const lastSeenRef = useRef<number>(0);
  const mountedAtRef = useRef<number>(Date.now());
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    lastSeenRef.current = Number(localStorage.getItem(seenKey) || 0);
    if (typeof Notification === "undefined") setPerm("unsupported");
    else setPerm(Notification.permission);
  }, [seenKey]);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const r = await fetch("/api/admin/feed");
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;

        let list: Item[] = [];
        if (manager) {
          list = (d.leads as FeedLead[]).map((l) => ({
            id: l.id,
            title: l.name,
            sub: l.car ? `${l.car}` : "новая заявка",
            createdAt: l.createdAt,
            href: "/admin/requests",
          }));
          setPendingCount(d.newLeads ?? 0);
        } else {
          list = (d.appointments as FeedAppt[]).map((a) => ({
            id: a.id,
            title: a.clientName,
            sub: new Date(a.start).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
            createdAt: a.createdAt,
            href: "/admin/calendar",
          }));
          setPendingCount(list.filter((i) => new Date(i.createdAt).getTime() > lastSeenRef.current).length);
        }
        setItems(list);

        // Десктоп-уведомления только для событий, появившихся после открытия панели.
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const it of list) {
            const ts = new Date(it.createdAt).getTime();
            if (ts > mountedAtRef.current && !notifiedRef.current.has(it.id)) {
              notifiedRef.current.add(it.id);
              new Notification(manager ? "Новая заявка" : "Новая запись", {
                body: `${it.title} · ${it.sub}`,
                icon: "/favicon.svg",
                tag: it.id,
              });
            }
          }
        } else {
          // всё равно помечаем как «уже видели», чтобы не спамить при выдаче прав
          list.forEach((it) => {
            if (new Date(it.createdAt).getTime() <= mountedAtRef.current) notifiedRef.current.add(it.id);
          });
        }
      } catch {
        /* сеть недоступна — тихо повторим */
      }
    }
    poll();
    const t = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [manager]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      lastSeenRef.current = now;
      localStorage.setItem(seenKey, String(now));
      if (!manager) setPendingCount(0);
    }
  }

  async function enableDesktop() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const badge = pendingCount;

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Уведомления"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-graphite hover:border-accent hover:text-accent"
      >
        {badge > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-bold text-graphite">
                {manager ? "Запросы" : "Мои записи"}
              </span>
              {perm !== "granted" && perm !== "unsupported" && (
                <button onClick={enableDesktop} className="text-xs font-medium text-accent hover:underline">
                  Вкл. уведомления
                </button>
              )}
              {perm === "granted" && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3.5 w-3.5" /> уведомления вкл.
                </span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">Пока пусто</p>
              ) : (
                <ul className="divide-y divide-line">
                  {items.slice(0, 20).map((it) => {
                    const fresh = new Date(it.createdAt).getTime() > lastSeenRef.current;
                    return (
                      <li key={it.id}>
                        <button
                          onClick={() => go(it.href)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-mist"
                        >
                          <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${fresh ? "bg-accent/10 text-accent" : "bg-mist text-muted"}`}>
                            {manager ? <Inbox className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-graphite">{it.title}</span>
                              {fresh && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                            </div>
                            <div className="truncate text-xs text-muted">{it.sub}</div>
                            <div className="text-[11px] text-muted">{timeAgo(it.createdAt)}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              onClick={() => go(manager ? "/admin/requests" : "/admin/calendar")}
              className="block w-full border-t border-line px-4 py-2.5 text-center text-sm font-medium text-accent hover:bg-mist"
            >
              {manager ? "Все запросы" : "В календарь"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
