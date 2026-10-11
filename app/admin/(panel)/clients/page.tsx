import { redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { ClientsBoard } from "@/components/admin/ClientsBoard";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user.role, "admin", "receiver")) redirect("/admin");
  return <ClientsBoard />;
}
