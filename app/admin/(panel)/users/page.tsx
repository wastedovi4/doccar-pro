import { redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { UsersManager } from "@/components/admin/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user.role, "admin")) redirect("/admin");
  return <UsersManager currentUserId={user.id} />;
}
