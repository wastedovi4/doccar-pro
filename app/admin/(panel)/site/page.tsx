import { redirect } from "next/navigation";
import { getSession, can } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { AdminEditor } from "@/components/admin/AdminEditor";

export const dynamic = "force-dynamic";

export default async function SitePage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user.role, "admin")) redirect("/admin");

  const content = await getContent();
  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold text-graphite">Управление сайтом</h1>
      <AdminEditor initial={content} />
    </div>
  );
}
