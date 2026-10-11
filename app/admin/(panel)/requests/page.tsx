import { redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { RequestsBoard } from "@/components/admin/RequestsBoard";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user.role, "admin", "receiver")) redirect("/admin");
  return <RequestsBoard canDelete={user.role === "admin"} />;
}
