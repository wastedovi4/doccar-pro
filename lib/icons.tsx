import type { AriaAttributes, ComponentType, SVGProps } from "react";
import {
  Settings,
  Wrench,
  ScanSearch,
  Cog,
  Disc3,
  CircleDot,
  Zap,
  Thermometer,
  Droplet,
  ClipboardCheck,
  Car,
  Battery,
  Snowflake,
  Gauge,
  BadgeCheck,
  Cpu,
  BadgeRussianRuble,
  MapPin,
  ShieldCheck,
  Clock,
  Users,
  Handshake,
  Timer,
} from "lucide-react";

export type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: AriaAttributes["aria-hidden"];
}>;

/* ---------- собственные иконки в стиле lucide (24×24, stroke = currentColor) ---------- */

function base(props: SVGProps<SVGSVGElement>) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

/** Монитор с линией пульса — «диагностика». */
function MonitorPulse(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M5.5 10h3l1.5-3 3 6 1.5-3h4" />
    </svg>
  );
}

/** Гаечный ключ + отвёртка крест-накрест — «ТО и обслуживание». */
function Tools(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      <path d="m2.5 5.5 3-3 3.5 3.5-3 3z" />
      <path d="m8 8 4.5 4.5M15.5 15.5 21 21M14 17l3-3" />
    </svg>
  );
}

/** Иконки контента. Ключ хранится в content.json, компонент резолвится здесь. */
export const ICONS: Record<string, IconComponent> = {
  "monitor-pulse": MonitorPulse,
  tools: Tools,
  gear: Settings,
  wrench: Wrench,
  scan: ScanSearch,
  engine: Cog,
  brake: Disc3,
  suspension: CircleDot,
  electric: Zap,
  cooling: Thermometer,
  oil: Droplet,
  check: ClipboardCheck,
  car: Car,
  battery: Battery,
  snow: Snowflake,
  gauge: Gauge,
  badge: BadgeCheck,
  cpu: Cpu,
  price: BadgeRussianRuble,
  pin: MapPin,
  shield: ShieldCheck,
  clock: Clock,
  team: Users,
  deal: Handshake,
  timer: Timer,
};

/** Ключи + подписи для селекта в админке. */
export const ICON_KEYS: { key: string; label: string }[] = [
  { key: "monitor-pulse", label: "Диагностика (монитор)" },
  { key: "tools", label: "ТО (ключ и отвёртка)" },
  { key: "gear", label: "Ремонт (шестерня)" },
  { key: "wrench", label: "Гаечный ключ" },
  { key: "scan", label: "Поиск неисправностей" },
  { key: "engine", label: "Двигатель" },
  { key: "brake", label: "Тормоза (диск)" },
  { key: "suspension", label: "Подвеска" },
  { key: "electric", label: "Электрика (молния)" },
  { key: "cooling", label: "Охлаждение" },
  { key: "oil", label: "Масло / жидкости" },
  { key: "check", label: "Проверка (чек-лист)" },
  { key: "car", label: "Автомобиль" },
  { key: "battery", label: "Аккумулятор" },
  { key: "snow", label: "Кондиционер" },
  { key: "gauge", label: "Приборы" },
  { key: "badge", label: "Знак качества" },
  { key: "cpu", label: "Оборудование (чип)" },
  { key: "price", label: "Цена (рубль)" },
  { key: "pin", label: "Расположение (метка)" },
  { key: "shield", label: "Гарантия (щит)" },
  { key: "clock", label: "Время" },
  { key: "team", label: "Команда" },
  { key: "deal", label: "Договорённость" },
  { key: "timer", label: "Сроки (таймер)" },
];

export function resolveIcon(key: string): IconComponent {
  return ICONS[key] ?? Wrench;
}
