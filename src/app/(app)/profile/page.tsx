import { requireUser } from "@/lib/auth";
import { draftFrom } from "@/lib/profile-draft";
import { ProfileClient } from "./ProfileClient";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const { profile, user } = await requireUser();
  const loginId = profile.phone ? `+${profile.phone}` : (user.email ?? "");
  return <ProfileClient userId={profile.id} initial={draftFrom(profile)} loginId={loginId} />;
}
