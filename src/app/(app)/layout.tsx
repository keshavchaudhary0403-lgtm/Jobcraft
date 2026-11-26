import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { RefreshOnReturn } from "@/components/RefreshOnReturn";
import { profileStrength } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user, supabase } = await requireUser();
  if (!profile.onboarded) redirect("/welcome");
  const { count } = await supabase.from("applications").select("id", { count: "exact", head: true });
  const name = profile.full_name || user.email?.replace(/@phone\.jobcraft\.invalid$/, "") || "You";
  return (
    <div className="min-h-screen bg-bg">
      <RefreshOnReturn />
      <Nav name={name} isAdmin={profile.is_admin} jobs={count ?? 0} strength={profileStrength(profile)} avatarUrl={user.avatarUrl} />
      <main className="lg:pl-[248px]">
        <div>
          <div className="mx-auto max-w-[1360px] px-4 pb-32 pt-4 sm:px-6 lg:px-4 lg:pb-8 lg:pt-3">
            {profile.is_demo && (
              <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-mustard/40 bg-mustard-soft px-4 py-2.5 text-[0.88rem] text-mustard-ink">
                <span className="font-semibold">You&apos;re exploring the demo.</span>
                <span>Sample data{profile.ai_mode === "demo" ? " and sample AI answers" : ""} - feel free to click around.</span>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
