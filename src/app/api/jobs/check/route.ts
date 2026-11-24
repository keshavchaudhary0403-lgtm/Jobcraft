import { currentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatTitle } from "@/lib/profile-format";
import { sameJob } from "@/lib/job-dupes";

/** Is this job already saved? (same link, or same company + role). Used by the extension panel. Reads only. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { url?: string; company?: string; role?: string; location?: string };
  const job = { job_url: b.url && /^https?:\/\//.test(b.url) ? b.url : null, company: formatTitle(String(b.company ?? ""), 80), role: formatTitle(String(b.role ?? "")), location: String(b.location ?? "") || null };
  const { data: mine } = await supabase.from("applications").select("id, company, role, location, job_url, created_at, analysis").eq("user_id", user.id);
  const hit = (mine ?? []).find((a) => sameJob(a, job));
  return Response.json({
    match: hit ? { id: hit.id, company: hit.company, role: hit.role, created_at: hit.created_at, analysed: !!hit.analysis, by: sameJob(hit, job), location: hit.location } : null,
  });
}
