import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OrdersBoard } from "@/components/admin/OrdersBoard";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  return <OrdersBoard role={user.role} />;
}
