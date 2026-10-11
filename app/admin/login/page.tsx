"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Ошибка входа");
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-coal p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-12 w-auto" />
          <h1 className="mt-4 text-xl font-bold text-white">
            Админка <Wordmark />
          </h1>
          <p className="mt-1 text-sm text-white/50">Вход для управления сайтом</p>
        </div>

        <label htmlFor="login" className="mb-1.5 block text-sm font-medium text-white/80">
          Логин
        </label>
        <input
          id="login"
          type="text"
          autoFocus
          autoComplete="username"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="mb-4 w-full rounded-lg border border-white/15 bg-night px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Введите логин"
        />

        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-night px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Введите пароль"
        />

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" aria-hidden /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-6 w-full disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Войти
        </button>
      </form>
    </div>
  );
}
