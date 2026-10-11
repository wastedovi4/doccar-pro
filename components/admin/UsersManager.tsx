"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, Trash2, KeyRound, Check, X } from "lucide-react";
import type { PublicUser, Role } from "@/lib/crm-types";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Владелец (полный доступ)" },
  { value: "receiver", label: "Приёмщик (запросы + календарь)" },
  { value: "mechanic", label: "Механик (свои работы)" },
];
const ROLE_LABEL: Record<Role, string> = {
  admin: "Владелец",
  receiver: "Приёмщик",
  mechanic: "Механик",
};

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // форма добавления
  const [nLogin, setNLogin] = useState("");
  const [nName, setNName] = useState("");
  const [nRole, setNRole] = useState<Role>("mechanic");
  const [nPass, setNPass] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/users").then((x) => x.json());
    if (r.ok) setUsers(r.users);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: nLogin, name: nName, role: nRole, password: nPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка");
      setNLogin("");
      setNName("");
      setNPass("");
      setNRole("mechanic");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Ошибка");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
  }

  async function resetPassword(id: string) {
    const pw = prompt("Новый пароль (от 4 символов):");
    if (!pw) return;
    if (pw.length < 4) {
      setError("Пароль слишком короткий");
      return;
    }
    await patch(id, { password: pw });
    alert("Пароль обновлён");
  }

  async function remove(id: string) {
    if (!confirm("Удалить сотрудника?")) return;
    setError("");
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Ошибка");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold text-graphite">Сотрудники</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Добавление */}
      <div className="mb-6 rounded-xl border border-line bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-graphite">Добавить сотрудника</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className={inputCls} placeholder="Логин" value={nLogin} onChange={(e) => setNLogin(e.target.value)} />
          <input className={inputCls} placeholder="Имя" value={nName} onChange={(e) => setNName(e.target.value)} />
          <select className={inputCls} value={nRole} onChange={(e) => setNRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Пароль"
            type="text"
            value={nPass}
            onChange={(e) => setNPass(e.target.value)}
          />
        </div>
        <button onClick={add} disabled={adding} className="btn-primary mt-3 disabled:opacity-70">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Добавить
        </button>
      </div>

      {/* Список */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-graphite">{u.name}</span>
                    {u.id === currentUserId && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">вы</span>
                    )}
                    {!u.active && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">отключён</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">логин: {u.login}</div>
                </div>

                <select
                  value={u.role}
                  onChange={(e) => patch(u.id, { role: e.target.value })}
                  className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {ROLE_LABEL[r.value]}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => patch(u.id, { active: !u.active })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm text-muted hover:border-accent hover:text-accent"
                  title={u.active ? "Отключить" : "Включить"}
                >
                  {u.active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  {u.active ? "Откл." : "Вкл."}
                </button>

                <button
                  onClick={() => resetPassword(u.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:border-accent hover:text-accent"
                  title="Сменить пароль"
                >
                  <KeyRound className="h-4 w-4" />
                </button>

                {u.id !== currentUserId && (
                  <button
                    onClick={() => remove(u.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:border-red-400 hover:text-red-500"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
