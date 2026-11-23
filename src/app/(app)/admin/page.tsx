import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AdminUsers } from "./AdminUsers";

export default async function AdminPage() {
  const { profile } = await requireUser();
  if (!profile.is_admin) redirect("/");
  return (
    <>
      <PageHeader eyebrow="Admin" title="Users & AI spending">
        Create logins with an email or phone number and a password. No email or OTP is sent — share the login with the person directly.
      </PageHeader>
      <AdminUsers meId={profile.id} />
    </>
  );
}
