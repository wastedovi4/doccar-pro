import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkOrderCard } from "@/components/admin/WorkOrderCard";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  return <WorkOrderCard id={params.id} role={user.role} />;
}
