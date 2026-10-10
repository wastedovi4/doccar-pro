import { NextResponse } from "next/server";
import { tx, uid, type Lead } from "@/lib/crm";

/**
 * Приём заявки с формы сайта. Заявка сохраняется в CRM (data/crm.json)
 * со статусом "new" и появляется в админке → «Запросы» у приёмщика.
 *
 * Telegram/WhatsApp намеренно не используются (заблокированы в РФ).
 * При желании сюда можно добавить дополнительное уведомление (e-mail/SMS).
 */
export async function POST(request: Request) {
  let data: any;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const name = String(data?.name ?? "").trim();
  const phone = String(data?.phone ?? "").trim();
  if (!name || phone.replace(/\D/g, "").length < 6) {
    return NextResponse.json(
      { ok: false, error: "Некорректные данные заявки" },
      { status: 400 }
    );
  }

  // Поля формы — с ограничением длины (публичный эндпоинт).
  const field = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

  const lead: Lead = {
    id: uid(),
    name: name.slice(0, 120),
    phone: phone.slice(0, 40),
    car: field(data?.car, 120),
    service: field(data?.service, 120),
    message: field(data?.message, 2000),
    status: "new",
    createdAt: new Date().toISOString(),
  };

  await tx((db) => {
    db.leads.unshift(lead);
  });

  return NextResponse.json({ ok: true });
}
