"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { WO_STATUS_LABEL, type WorkOrderStatus } from "@/lib/crm-types";

/** Модальное окно админки: подложка, Esc, прокрутка длинного содержимого. */
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`mt-8 w-full rounded-2xl bg-white shadow-xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-lg font-bold text-graphite">{title}</h3>
          <button onClick={onClose} aria-label="Закрыть" className="text-muted hover:text-graphite">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

const STATUS_CLS: Record<WorkOrderStatus, string> = {
  open: "bg-sky-50 text-sky-700",
  in_progress: "bg-amber-50 text-amber-700",
  ready: "bg-lime-100 text-lime-800",
  closed: "bg-mist text-muted",
  cancelled: "bg-red-50 text-red-600",
};

export function WoStatusChip({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[status]}`}>
      {WO_STATUS_LABEL[status]}
    </span>
  );
}

export function fmtDate(iso?: string, withTime = true): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Подпись поля в формах CRM. */
export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-1 block text-xs font-medium text-muted">
      {children}
      {required && <span className="text-accent"> *</span>}
    </span>
  );
}

export const crmInput =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-graphite focus:outline-none focus:ring-2 focus:ring-accent";
