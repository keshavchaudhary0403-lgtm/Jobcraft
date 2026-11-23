import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { startSession } from "@/lib/actions";
import type { Session } from "@/lib/types";

export default async function LinkedInPage() {
  const { supabase, profile } = await requireUser();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("kind", "linkedin")
    .order("updated_at", { ascending: false })
    .returns<Session[]>();
  const start = startSession.bind(null, "linkedin");

  return (
    <>
      <PageHeader eyebrow="Prompt 4" title="LinkedIn rewrite">
        3 headline options recruiters will actually search for, an About section with a real hook, and the 5 skills to pin —
        built only from what&apos;s true in your resume.
      </PageHeader>
      <form action={start} className="card mb-10 space-y-4 p-5 sm:p-6">
        <div>
          <label className="label">Target role and industry</label>
          <input name="role" className="field" required defaultValue={profile.target_role ?? ""} placeholder="e.g. Digital Marketing Manager in e-commerce or D2C" />
          <p className="mt-1 text-xs text-muted">Uses your master resume from “My details”.</p>
        </div>
        <button className="btn btn-primary">Rewrite my LinkedIn</button>
      </form>
      <h2 className="mb-3 font-medium">Past versions</h2>
      <SessionList sessions={sessions ?? []} base="/linkedin" empty="Nothing yet." />
    </>
  );
}
