import { notFound } from "next/navigation";
import { getContent } from "@/lib/content";
import { getPublicReport } from "@/lib/order-items";
import { woNumber } from "@/lib/format";
import { OrderDocument } from "@/components/OrderDocument";
import { PrintBar, PRINT_CSS } from "@/components/PrintBar";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Отчёт по ремонту", robots: { index: false, follow: false } };

/**
 * Онлайн-отчёт для клиента по секретной ссылке (QR на распечатке): работы,
 * запчасти, итог, заключение мастера, рекомендации. Без внутренних заметок,
 * телефон замаскирован. Ссылку можно отозвать из карточки наряда.
 */
export default async function PublicReportPage({ params }: { params: { token: string } }) {
  const report = getPublicReport(params.token);
  if (!report) notFound();
  const { business } = await getContent();

  return (
    <div className="min-h-screen bg-night pb-10 print:bg-white print:pb-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <header className="mb-6 border-b border-white/[0.06] print:hidden">
        <div className="container-x flex h-16 items-center justify-between">
          <a href="/" aria-label={`${business.name} — на сайт`}>
            <Logo tagline={`Автосервис ${business.city}`} />
          </a>
          <a href="/#booking" className="btn-primary min-h-[40px] py-2">
            Записаться
          </a>
        </div>
      </header>
      <PrintBar title={`Отчёт по заказ-наряду ${woNumber(report.number)}`} dark />
      <div className="px-4 print:px-0">
        <div className="mx-auto max-w-[794px] overflow-hidden rounded-xl shadow-2xl print:rounded-none print:shadow-none">
          <OrderDocument order={report} business={business} clientPhone={report.maskedPhone} />
        </div>
      </div>
    </div>
  );
}
