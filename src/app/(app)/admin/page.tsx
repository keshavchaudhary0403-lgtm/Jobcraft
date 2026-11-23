import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AdminUsers } from "./AdminUsers";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const { profile } = await requireUser();
  if (!profile.is_admin) redirect("/");
  return (
    <>
      <PageHeader title="Admin" sub="Users, AI model and spending." />
      <AdminUsers meId={profile.id} />
    </>
  );
}
