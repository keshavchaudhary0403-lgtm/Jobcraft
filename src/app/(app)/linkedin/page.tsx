import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import type { LinkedInResult } from "@/lib/tasks";
import { LinkedInClient } from "./LinkedInClient";

export const metadata = { title: "LinkedIn" };

export default async function LinkedInPage() {
  const { profile } = await requireUser();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="LinkedIn" sub="Show up when recruiters search." />
      <LinkedInClient initial={(profile.linkedin_result as LinkedInResult | null) ?? null} targetRole={profile.target_role ?? ""} url={profile.linkedin_url} />
    </div>
  );
}
