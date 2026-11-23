import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireUser();
  return (
    <div className="min-h-screen">
      <Nav name={profile.full_name || user.email?.replace(/@phone\.jobpilot\.invalid$/, "") || "You"} isAdmin={profile.is_admin} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
