import { redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { BackupPanel } from "@/components/admin/BackupPanel";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user.role, "admin")) redirect("/admin");
  return <BackupPanel />;
}
