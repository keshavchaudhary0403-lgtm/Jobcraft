import { requireUser } from "@/lib/auth";
import type { LinkedInResult } from "@/lib/tasks";
import { LinkedInClient } from "./LinkedInClient";

export const metadata = { title: "LinkedIn" };

export default async function LinkedInPage() {
  const { profile } = await requireUser();
  return (
    <LinkedInClient
      initial={(profile.linkedin_result as LinkedInResult | null) ?? null}
      name={profile.full_name ?? "You"}
      title={profile.current_title ?? ""}
      city={profile.city ?? ""}
      targetRole={profile.target_role ?? ""}
      url={profile.linkedin_url}
    />
  );
}
