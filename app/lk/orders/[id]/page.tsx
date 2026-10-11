import { notFound, redirect } from "next/navigation";
import { getClientSession } from "@/lib/client-access";
import { getLkOrder } from "@/lib/lk";
import { getContent } from "@/lib/content";
import { OrderDocument } from "@/components/OrderDocument";
import { PrintBar, PRINT_CSS } from "@/components/PrintBar";
import { LkHeader } from "@/components/lk/LkHeader";

export const dynamic = "force-dynamic";

/** Заказ-наряд клиента в кабинете — полный отчёт (только свой). */
export default async function LkOrderPage({ params }: { params: { id: string } }) {
  const session = getClientSession();
  if (!session) redirect("/lk");
  const order = getLkOrder(session.clientId, params.id);
  if (!order) notFound();
  const { business } = await getContent();

  return (
    <div className="min-h-screen bg-night pb-10 print:bg-white print:pb-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <LkHeader city={business.city} signedIn />
      <div className="pt-6 print:pt-0">
        <PrintBar title="" back={{ href: "/lk", label: "В кабинет" }} dark />
        <div className="px-4 print:px-0">
          <div className="mx-auto max-w-[794px] overflow-hidden rounded-xl shadow-2xl print:rounded-none print:shadow-none">
            <OrderDocument order={order} business={business} clientPhone={order.client.phone} />
          </div>
        </div>
      </div>
    </div>
  );
}
