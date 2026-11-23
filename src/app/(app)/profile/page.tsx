import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { draftFrom } from "@/components/ProfileReview";
import { ProfileClient } from "./ProfileClient";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const { profile, user } = await requireUser();
  const loginId = profile.phone ? `+${profile.phone}` : (user.email ?? "");
  return (
    <>
      <PageHeader title="My profile" sub="The facts behind everything Jobcraft writes for you." />
      <ProfileClient userId={profile.id} initial={draftFrom(profile)} loginId={loginId} />
    </>
  );
}
