import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { CalendarView } from "@/components/admin/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  const { workHours } = await getContent();
  return <CalendarView role={user.role} userId={user.id} workHours={workHours} />;
}
