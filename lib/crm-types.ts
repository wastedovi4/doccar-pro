/**
 * Типы CRM (без зависимостей — можно импортировать в клиентских компонентах).
 * Хранилище — SQLite (lib/db.ts), доступ — репозитории lib/crm.ts.
 */

export type Role = "admin" | "receiver" | "mechanic";

export type User = {
  id: string;
  login: string;
  name: string;
  role: Role;
  password: string; // "salt:hashHex" (scrypt)
  active: boolean;
  createdAt: string;
};
export type PublicUser = Omit<User, "password">;

export type LeadStatus = "new" | "seen" | "processed" | "archived";
export type Lead = {
  id: string;
  name: string;
  phone: string;
  car: string;
  service?: string; // услуга, выбранная в форме записи
  message: string;
  status: LeadStatus;
  createdAt: string;
  seenAt?: string;
  seenBy?: string; // userId
  processedAt?: string;
  processedBy?: string; // userId
  note?: string;
  appointmentId?: string;
};

export type ApptStatus = "scheduled" | "in_progress" | "done" | "cancelled";
export type Appointment = {
  id: string;
  leadId?: string;
  clientName: string;
  phone: string;
  car: string;
  service: string;
  mechanicId?: string;
  start: string; // ISO datetime
  durationMin: number;
  status: ApptStatus;
  note?: string;
  createdBy?: string; // userId (пусто, если сотрудник удалён)
  createdAt: string;
};

export const ROLES: Role[] = ["admin", "receiver", "mechanic"];
export const LEAD_STATUSES: LeadStatus[] = ["new", "seen", "processed", "archived"];
export const APPT_STATUSES: ApptStatus[] = ["scheduled", "in_progress", "done", "cancelled"];
