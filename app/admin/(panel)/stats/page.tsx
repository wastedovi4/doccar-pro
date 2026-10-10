import { redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { StatsView } from "@/components/admin/StatsView";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user.role, "admin")) redirect("/admin");
  return <StatsView />;
}
