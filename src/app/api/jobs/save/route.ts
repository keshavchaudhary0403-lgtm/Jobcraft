import { currentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatCity, formatTitle } from "@/lib/profile-format";
import { sameJob } from "@/lib/job-dupes";
import { findDomain, saveLogo, toDomain } from "@/lib/company-brand";
import { hiringFromContacts } from "@/lib/hiring-contact";

/**
 * Save a job (from Add job or the Chrome extension). Saves only - no AI runs here.
 * If the same job is already saved (same link, or same company + role) it answers 409 with that job,
 * unless the user chose "Save anyway" (force).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Log in to Jobcraft first." }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as { jd?: string; url?: string; company?: string; role?: string; location?: string; company_type?: string; force?: boolean; website?: string; logo?: string; contacts?: unknown };
  const jd = String(b.jd ?? "").trim().slice(0, 30000);
  const company = formatTitle(String(b.company ?? ""), 80);
  const role = formatTitle(String(b.role ?? ""));
  if (jd.split(/\s+/).filter(Boolean).length < 30) return Response.json({ error: "The description needs at least 30 words." }, { status: 400 });
  if (!company || !role) return Response.json({ error: "Add the company and the role." }, { status: 400 });
  const job_url = b.url && /^https?:\/\//.test(b.url) ? b.url.trim().slice(0, 500) : null;

  if (!b.force) {
    const { data: mine } = await supabase.from("applications").select("id, company, role, location, job_url, created_at, analysis").eq("user_id", user.id);
    const loc = formatCity(String(b.location ?? "")) || null;
    const hit = (mine ?? []).find((a) => sameJob(a, { job_url, company, role, location: loc }));
    if (hit) {
      return Response.json(
        { duplicate: { id: hit.id, company: hit.company, role: hit.role, created_at: hit.created_at, analysed: !!hit.analysis, by: sameJob(hit, { job_url, company, role, location: loc }), location: hit.location } },
        { status: 409 },
      );
    }
  }

  // The company's website (for the official wordmark): from the job page if it showed one, else an exact-name match.
  const company_domain = toDomain(b.website) ?? (await findDomain(company));
  const row = { user_id: user.id, jd, job_url, company, role, location: formatCity(String(b.location ?? "")) || null, company_type: String(b.company_type ?? "").trim() || null, hiring_contact: hiringFromContacts(b.contacts) };
  let { data, error } = await supabase.from("applications").insert({ ...row, company_domain }).select("id").single();
  const brandColumns = !(error && /company_domain|column/i.test(error.message));
  if (!brandColumns) ({ data, error } = await supabase.from("applications").insert(row).select("id").single()); // before migration 011
  if (error || !data) return Response.json({ error: error?.message ?? "Couldn't save." }, { status: 500 });
  if (brandColumns && b.logo) {
    const logo = await saveLogo(user.id, data.id, b.logo).catch(() => null);
    if (logo) await supabase.from("applications").update({ company_logo: logo }).eq("id", data.id);
  }
  return Response.json({ id: data.id });
}
