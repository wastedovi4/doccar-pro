import { redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { ClientCard } from "@/components/admin/ClientCard";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user.role, "admin", "receiver")) redirect("/admin");
  return <ClientCard id={params.id} />;
}
