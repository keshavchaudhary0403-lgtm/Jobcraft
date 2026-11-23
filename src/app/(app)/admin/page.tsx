import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AdminUsers } from "./AdminUsers";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const { profile } = await requireUser();
  if (!profile.is_admin) redirect("/");
  return <AdminUsers meId={profile.id} />;
}
