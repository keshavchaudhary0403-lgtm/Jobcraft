import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const { profile, user } = await requireUser();
  if (profile.onboarded) redirect("/");
  const loginId = profile.phone ? `+${profile.phone}` : (user.email ?? "");
  return <Onboarding userId={profile.id} first={profile.full_name?.split(" ")[0] ?? null} loginId={loginId} />;
}
