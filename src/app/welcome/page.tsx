import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const { profile } = await requireUser();
  if (profile.onboarded) redirect("/");
  const first = profile.full_name?.split(" ")[0];
  return (
    <div className="ai-gradient min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <Logo />
        <Onboarding userId={profile.id} first={first ?? null} />
      </div>
    </div>
  );
}
