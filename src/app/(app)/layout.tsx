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
          <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            {profile.is_demo && (
              <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-brand/15 bg-brand-soft px-4 py-2.5 text-[14px] text-brand-ink">
                <span className="font-semibold">You&apos;re exploring the demo.</span>
                <span>Sample data{profile.ai_mode === "demo" ? " and sample AI answers" : ""} — feel free to click around.</span>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
