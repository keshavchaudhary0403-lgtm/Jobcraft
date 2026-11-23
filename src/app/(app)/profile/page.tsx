import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const { profile, user } = await requireUser();
  return (
    <>
      <PageHeader eyebrow="Step 0" title="My details & master resume">
        Fill this in once. Every prompt uses it, so be complete and honest — the AI will only reframe what&apos;s here, never invent.
      </PageHeader>
      <ProfileForm profile={profile} loginId={profile.phone ? `+${profile.phone}` : (user.email ?? "")} />
    </>
  );
}
