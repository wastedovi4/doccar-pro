import qrcode from "qrcode-generator";
import { REC_PRIORITY_LABEL, type WorkOrderDetail } from "@/lib/crm-types";
import { fullAddress, type Content } from "@/lib/content-model";
import { formatMileage, formatQty, lineAmount, plateDisplay, rub, woNumber } from "@/lib/format";
import { LogoMark } from "@/components/Logo";

/** QR-код как inline SVG (без внешних запросов). */
function qrSvg(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
}

const dateRu = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }) : "");

/**
 * Заказ-наряд как документ: для печати на А4 (админка) и для онлайн-отчёта
 * клиента по ссылке из QR. Светлая «бумажная» вёрстка, независимая от темы сайта.
 */
export function OrderDocument({
  order,
  business,
  shareUrl,
  clientPhone,
}: {
  order: WorkOrderDetail;
  business: Content["business"];
  shareUrl?: string; // есть — печатается QR
  clientPhone?: string; // телефон клиента (в публичном отчёте — маскированный)
}) {
  const works = order.lines.filter((l) => l.kind === "work");
  const parts = order.lines.filter((l) => l.kind === "part");
  const t = order.totals;
  const recs = order.recommendations.filter((r) => r.status === "open");
  const done = order.carried.filter((r) => r.status === "done" && r.resolvedOrderId === order.id);
  const vehicle = order.vehicle;

  const th = "border-b border-neutral-400 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-600";
  const td = "border-b border-neutral-200 py-1.5 align-top";

  return (
    <article className="mx-auto w-full max-w-[794px] bg-white px-10 py-9 text-[13px] leading-snug text-neutral-900 print:max-w-none print:px-0 print:py-0">
      {/* Шапка */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
        <div className="flex items-center gap-3">
          <LogoMark tone="tile" className="h-10 w-auto" />
          <div>
            <div className="text-lg font-extrabold tracking-wide">{business.name}</div>
            <div className="text-[11px] text-neutral-600">
              {[fullAddress(business), business.phoneDisplay || business.phone, business.email].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Заказ-наряд</div>
          <div className="font-mono text-xl font-bold">{woNumber(order.number)}</div>
          <div className="text-[11px] text-neutral-600">от {dateRu(order.openedAt)}</div>
          {order.closedAt && <div className="text-[11px] text-neutral-600">выдан {dateRu(order.closedAt)}</div>}
        </div>
      </header>

      {/* Клиент и автомобиль */}
      <section className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Заказчик</div>
          <div className="mt-0.5 font-semibold">{order.client.name}</div>
          {clientPhone && <div className="text-neutral-700">{clientPhone}</div>}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Автомобиль</div>
          <div className="mt-0.5 font-semibold">
            {vehicle ? [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ") || "—" : "—"}
          </div>
          <div className="text-neutral-700">
            {[vehicle?.plate && `госномер ${plateDisplay(vehicle.plate)}`, order.mileage !== undefined && `пробег ${formatMileage(order.mileage)}`]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {vehicle?.vin && <div className="font-mono text-[11px] text-neutral-600">VIN {vehicle.vin}</div>}
        </div>
      </section>

      {order.complaint && (
        <section className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Обращение заказчика</div>
          <p className="mt-0.5 whitespace-pre-line">{order.complaint}</p>
        </section>
      )}

      {/* Работы */}
      <section className="mt-5">
        <h2 className="mb-1 text-sm font-bold">Выполненные работы</h2>
        {works.length === 0 ? (
          <p className="text-neutral-500">—</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-7`}>№</th>
                <th className={th}>Наименование</th>
                <th className={`${th} w-16 text-right`}>Н/ч</th>
                <th className={`${th} w-24 text-right`}>Цена н/ч</th>
                <th className={`${th} w-28 text-right`}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {works.map((l, i) => (
                <tr key={l.id}>
                  <td className={td}>{i + 1}</td>
                  <td className={td}>{l.name}</td>
                  <td className={`${td} text-right`}>{formatQty(l.qty)}</td>
                  <td className={`${td} text-right`}>{rub(l.price)}</td>
                  <td className={`${td} text-right`}>{rub(lineAmount(l.qty, l.price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Запчасти */}
      {parts.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-1 text-sm font-bold">Запчасти и материалы</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-7`}>№</th>
                <th className={th}>Наименование</th>
                <th className={`${th} w-28`}>Артикул</th>
                <th className={`${th} w-16 text-right`}>Кол-во</th>
                <th className={`${th} w-24 text-right`}>Цена</th>
                <th className={`${th} w-28 text-right`}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((l, i) => (
                <tr key={l.id}>
                  <td className={td}>{i + 1}</td>
                  <td className={td}>
                    {l.name}
                    {l.source === "client" && <span className="ml-1 text-[11px] text-neutral-500">(материал заказчика)</span>}
                  </td>
                  <td className={`${td} font-mono text-[11px]`}>{l.article}</td>
                  <td className={`${td} text-right`}>
                    {formatQty(l.qty)} {l.unit}
                  </td>
                  <td className={`${td} text-right`}>{l.source === "client" ? "—" : rub(l.price)}</td>
                  <td className={`${td} text-right`}>{l.source === "client" ? "—" : rub(lineAmount(l.qty, l.price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Итоги */}
      {t && (
        <section className="mt-4 flex justify-end">
          <dl className="grid w-72 grid-cols-[1fr_auto] gap-x-6 gap-y-1">
            <dt className="text-neutral-600">Работы</dt>
            <dd className="text-right">{rub(t.works)}</dd>
            <dt className="text-neutral-600">Запчасти и материалы</dt>
            <dd className="text-right">{rub(t.parts)}</dd>
            {t.discount > 0 && (
              <>
                <dt className="text-neutral-600">Скидка</dt>
                <dd className="text-right">− {rub(t.discount)}</dd>
              </>
            )}
            <dt className="border-t-2 border-neutral-900 pt-1 font-bold">Итого</dt>
            <dd className="border-t-2 border-neutral-900 pt-1 text-right text-base font-extrabold">{rub(t.total)}</dd>
          </dl>
        </section>
      )}

      {order.report && (
        <section className="mt-5">
          <h2 className="mb-1 text-sm font-bold">Заключение мастера</h2>
          <p className="whitespace-pre-line">{order.report}</p>
        </section>
      )}

      {(recs.length > 0 || done.length > 0) && (
        <section className="mt-5">
          <h2 className="mb-1 text-sm font-bold">Рекомендации</h2>
          <ul className="space-y-1">
            {recs.map((r) => (
              <li key={r.id} className="flex gap-2">
                <span className="w-36 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                  {REC_PRIORITY_LABEL[r.priority]}
                </span>
                <span>
                  {r.text}
                  {r.estimate !== undefined && <span className="text-neutral-500"> — ориентир {rub(r.estimate)}</span>}
                </span>
              </li>
            ))}
            {done.map((r) => (
              <li key={r.id} className="flex gap-2 text-neutral-500">
                <span className="w-36 shrink-0 text-[11px] font-semibold uppercase tracking-wide">Выполнено</span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Подписи + QR */}
      <footer className="mt-8 flex items-end justify-between gap-6 border-t border-neutral-300 pt-5">
        <div className="flex-1 space-y-6 text-[12px]">
          <div className="grid grid-cols-2 gap-8">
            <div>
              Исполнитель
              <div className="mt-6 border-b border-neutral-500" />
              <div className="mt-0.5 text-[10px] text-neutral-500">{order.mechanicName ?? ""}</div>
            </div>
            <div>
              Работы принял, претензий не имею
              <div className="mt-6 border-b border-neutral-500" />
              <div className="mt-0.5 text-[10px] text-neutral-500">{order.client.name}</div>
            </div>
          </div>
          <p className="text-[10px] text-neutral-500">
            Документ не является кассовым чеком. Кассовый чек выдаётся при оплате.
          </p>
        </div>
        {shareUrl && (
          <div className="w-28 shrink-0 text-center">
            <div className="h-24 w-24 mx-auto [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg(shareUrl) }} />
            <div className="mt-1 text-[9px] leading-tight text-neutral-500">Отчёт онлайн и рекомендации</div>
          </div>
        )}
      </footer>
    </article>
  );
}
