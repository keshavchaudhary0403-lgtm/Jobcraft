import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireUser();
  if (!profile.onboarded) redirect("/welcome");
  const name = profile.full_name || user.email?.replace(/@phone\.jobcraft\.invalid$/, "") || "You";
  return (
    <div className="min-h-screen">
      <Nav name={name} isAdmin={profile.is_admin} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>
      </main>
    </div>
  );
}
