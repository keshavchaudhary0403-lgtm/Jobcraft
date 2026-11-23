import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { profileStrength } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user, supabase } = await requireUser();
  if (!profile.onboarded) redirect("/welcome");
  const { count } = await supabase.from("applications").select("id", { count: "exact", head: true });
  const name = profile.full_name || user.email?.replace(/@phone\.jobcraft\.invalid$/, "") || "You";
  return (
    <div className="min-h-screen bg-side">
      <Nav name={name} isAdmin={profile.is_admin} jobs={count ?? 0} strength={profileStrength(profile)} />
      <main className="lg:pl-60">
        <div className="min-h-screen bg-bg lg:rounded-l-[32px]">
          <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
