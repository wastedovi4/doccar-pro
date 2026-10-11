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
  clientId?: string; // клиент — после «Клиент приехал»
  workOrderId?: string; // открытый по записи заказ-наряд
  workOrderNumber?: number;
};

/* ---------- клиенты, автомобили, заказ-наряды ---------- */

export type Client = {
  id: string;
  name: string;
  phone: string; // как ввели
  phoneNorm?: string; // 7XXXXXXXXXX — ключ склейки (уникален)
  email: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Vehicle = {
  id: string;
  clientId: string;
  make: string;
  model: string;
  year?: number;
  plate: string; // ключ госномера (латиница, без пробелов) — вывод через plateDisplay
  vin: string;
  mileage?: number; // последний известный пробег, км
  note: string;
  createdAt: string;
};

/** Строка списка клиентов. */
export type ClientListItem = Client & {
  vehicles: string[]; // подписи «Kia Rio · А123ВС 77»
  orders: number;
  lastVisit?: string;
};

export type WorkOrderStatus = "open" | "in_progress" | "ready" | "closed" | "cancelled";

export type WorkOrder = {
  id: string;
  number: number;
  clientId: string;
  vehicleId?: string;
  appointmentId?: string;
  mechanicId?: string;
  status: WorkOrderStatus;
  complaint: string; // жалоба / что просит клиент
  mileage?: number; // пробег при приёмке
  note: string;
  openedAt: string;
  closedAt?: string;
  createdBy?: string;
  updatedAt: string;
};

/** Заказ-наряд со связанными данными — для списков и карточки. */
export type WorkOrderView = WorkOrder & {
  client: { id: string; name: string; phone?: string }; // телефон механику не отдаётся
  vehicle?: Pick<Vehicle, "id" | "make" | "model" | "year" | "plate" | "vin">;
  mechanicName?: string;
};

export const ROLES: Role[] = ["admin", "receiver", "mechanic"];
export const LEAD_STATUSES: LeadStatus[] = ["new", "seen", "processed", "archived"];
export const APPT_STATUSES: ApptStatus[] = ["scheduled", "in_progress", "done", "cancelled"];
export const WO_STATUSES: WorkOrderStatus[] = ["open", "in_progress", "ready", "closed", "cancelled"];

export const WO_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  open: "Открыт",
  in_progress: "В работе",
  ready: "Готов к выдаче",
  closed: "Выдан",
  cancelled: "Отменён",
};

/** Статусы, которые механик может ставить на своём наряде. */
export const WO_MECHANIC_STATUSES: WorkOrderStatus[] = ["in_progress", "ready"];
