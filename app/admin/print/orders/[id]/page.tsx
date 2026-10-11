import { notFound, redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { ensurePublicToken, getWorkOrderDetail } from "@/lib/order-items";
import { publicOrigin } from "@/lib/public-url";
import { woNumber } from "@/lib/format";
import { OrderDocument } from "@/components/OrderDocument";
import { PrintBar, PRINT_CSS } from "@/components/PrintBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Печать заказ-наряда", robots: { index: false, follow: false } };

/** Заказ-наряд для печати на А4 (вне оболочки админки). QR ведёт на онлайн-отчёт клиента. */
export default async function PrintOrderPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user.role, "admin", "receiver")) redirect(`/admin/orders/${params.id}`);

  const order = getWorkOrderDetail(params.id, user);
  if (!order) notFound();
  const token = ensurePublicToken(params.id, user);
  const { business } = await getContent();

  return (
    <div className="min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <PrintBar title={woNumber(order.number)} back={{ href: `/admin/orders/${params.id}`, label: "К наряду" }} />
      <div className="shadow-xl print:shadow-none">
        <OrderDocument
          order={order}
          business={business}
          clientPhone={order.client.phone}
          shareUrl={token ? `${await publicOrigin()}/r/${token}` : undefined}
        />
      </div>
    </div>
  );
}
