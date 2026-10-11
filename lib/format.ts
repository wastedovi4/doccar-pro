/**
 * Нормализация и форматирование данных клиентов/автомобилей.
 * Чистые функции — используются и сервером (поиск, уникальность), и админкой (вывод).
 */

/**
 * Телефон → канонический вид для поиска и уникальности.
 * Российские номера: 8XXXXXXXXXX / +7… / 9XXXXXXXXX → 7XXXXXXXXXX.
 * Прочие (≥ 6 цифр) — как есть цифрами. Короче — null (не телефон).
 */
export function normalizePhone(raw: string): string | null {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length === 11 && (d[0] === "8" || d[0] === "7")) return "7" + d.slice(1);
  if (d.length === 10 && d[0] === "9") return "7" + d;
  return d.length >= 6 ? d : null;
}

/** 79001234567 → +7 (900) 123-45-67; прочее — как пришло. */
export function formatPhone(norm: string | null | undefined, fallback = ""): string {
  if (norm && /^7\d{10}$/.test(norm)) {
    return `+7 (${norm.slice(1, 4)}) ${norm.slice(4, 7)}-${norm.slice(7, 9)}-${norm.slice(9, 11)}`;
  }
  return fallback || norm || "";
}

// Буквы госномеров РФ, совпадающие по начертанию в кириллице и латинице.
const CYR = "АВЕКМНОРСТУХ";
const LAT = "ABEKMHOPCTYX";

/** Госномер → ключ: верхний регистр, без пробелов/дефисов, кириллица → латиница. */
export function plateKey(raw: string): string {
  return (raw || "")
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .replace(/[АВЕКМНОРСТУХ]/g, (ch) => LAT[CYR.indexOf(ch)]);
}

/** Ключ госномера → вид для людей (кириллица): A123BC77 → А123ВС 77. */
export function plateDisplay(key: string): string {
  if (!key) return "";
  const cyr = key.replace(/[ABEKMHOPCTYX]/g, (ch) => CYR[LAT.indexOf(ch)]);
  const m = cyr.match(/^([А-Я]\d{3}[А-Я]{2})(\d{2,3})$/);
  return m ? `${m[1]} ${m[2]}` : cyr;
}

/** VIN: верхний регистр без пробелов. */
export function normalizeVin(raw: string): string {
  return (raw || "").toUpperCase().replace(/\s/g, "");
}

/** Корректный 17-значный VIN (без I, O, Q). Старые/японские номера кузова — допустимы, но без этой проверки. */
export function isValidVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

/** «Kia Rio 2018 · А123ВС 77» */
export function vehicleLabel(v: { make?: string; model?: string; year?: number | null; plate?: string } | null | undefined): string {
  if (!v) return "";
  const name = [v.make, v.model, v.year || ""].filter(Boolean).join(" ").trim();
  const plate = v.plate ? plateDisplay(v.plate) : "";
  return [name, plate].filter(Boolean).join(" · ");
}

/** Номер заказ-наряда для людей: 12 → ЗН-000012. */
export function woNumber(n: number): string {
  return `ЗН-${String(n).padStart(6, "0")}`;
}

/** Деньги: копейки → «12 345 ₽» / «12 345,50 ₽». */
export function rub(kop: number | null | undefined): string {
  if (kop === null || kop === undefined) return "";
  const v = kop / 100;
  return `${v.toLocaleString("ru-RU", { minimumFractionDigits: kop % 100 ? 2 : 0, maximumFractionDigits: 2 })} ₽`;
}

/** Ввод денег «1 234,5» / «1234.50» → копейки; пусто/мусор → null. */
export function parseRub(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? Math.round(raw * 100) : null;
  const s = String(raw).replace(/\s|₽|руб\.?/gi, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Копейки → строка для поля ввода: 150050 → «1500,5». */
export function rubInput(kop: number | null | undefined): string {
  if (kop === null || kop === undefined) return "";
  return String(kop / 100).replace(".", ",");
}

/** Количество для людей: 1.5 → «1,5». */
export function formatQty(q: number): string {
  return q.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
}

/** Сумма строки, копейки: qty × price с округлением. */
export function lineAmount(qty: number, price: number | null | undefined): number {
  return price === null || price === undefined ? 0 : Math.round(qty * price);
}

/** Пробег для людей: 123456 → «123 456 км». */
export function formatMileage(km: number | null | undefined): string {
  return km || km === 0 ? `${km.toLocaleString("ru-RU")} км` : "";
}
