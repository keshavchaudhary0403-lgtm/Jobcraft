import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FIXTURES } from "./demo";
import type { ParsedResume } from "./tasks";

/** The shared demo account. Nobody knows its password — visitors get in via "Explore the demo". */
export const DEMO_EMAIL = "demo@demo.jobcraft.invalid";

const JD_UC = `Senior Category Manager — Urban Company (Gurugram)

About the role
You will own partner quality and operational excellence for a set of cities in our home services category.

What you'll do
- Select, onboard and train service partners, and hold a high quality bar
- Track ratings, complaints and repeat rates; act fast when a city slips
- Grow the category with new offerings and better partner supply
- Lead a team of city managers and work closely with product, growth and support

What we're looking for
- 6+ years in operations, ideally multi-city consumer services
- Proven results improving partner or service quality
- Comfort with data (Excel/SQL) and clear written updates for leadership`;

const JD_NEST = `Operations Lead — Nestaway (Bengaluru)

We're hiring an Operations Lead to run move-ins, maintenance and vendor partners across 3 cities.

Responsibilities
- Own turnaround time and tenant satisfaction for move-ins and repairs
- Build and manage a vendor network; negotiate rates and SLAs
- Run weekly reviews with city teams and fix recurring issues

Requirements
- 5+ years in operations in a consumer or real-estate business
- Experience managing vendors and on-ground teams
- Strong Excel skills`;

/** Find the demo user, creating it (with sample data) if needed. */
export async function ensureDemoUser(admin: SupabaseClient): Promise<string> {
  const { data: existing } = await admin.from("profiles").select("id").eq("is_demo", true).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: randomBytes(24).toString("base64url"), // never shown or used
    email_confirm: true,
    user_metadata: { full_name: "Asha Nair (demo)" },
  });
  let id = data.user?.id;
  if (error || !id) {
    // Already exists in auth (e.g. profile flag lost) — look it up.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    id = list?.users.find((u) => u.email === DEMO_EMAIL)?.id;
    if (!id) throw new Error(error?.message ?? "Could not create the demo account");
  }
  await admin.from("profiles").upsert({ id, email: null, is_demo: true, ai_mode: "demo", is_admin: false, is_active: true });
  await seedDemo(admin, id);
  return id;
}

/** Wipe the demo account's jobs/sessions and restore the sample profile + jobs. */
export async function seedDemo(admin: SupabaseClient, id: string) {
  const r = FIXTURES.parse_resume as ParsedResume;
  await admin.from("sessions").delete().eq("user_id", id);
  await admin.from("applications").delete().eq("user_id", id);
  await admin
    .from("profiles")
    .update({
      full_name: r.full_name,
      current_title: r.current_title,
      target_role: r.target_role,
      experience_years: r.experience_years,
      city: r.city,
      strongest_proof: r.strongest_proof,
      skills: r.skills,
      master_resume: r.resume_text,
      current_ctc: "₹8 LPA",
      linkedin_url: null,
      extra_notes: null,
      linkedin_result: FIXTURES.linkedin,
      onboarded: true,
    })
    .eq("id", id);
  const resume = FIXTURES.resume as { resume_markdown: string };
  await admin.from("applications").insert([
    {
      user_id: id,
      company: "Urban Company",
      role: "Senior Category Manager",
      location: "Gurugram",
      company_type: "Consumer services marketplace",
      seniority: "Senior",
      status: "applied",
      applied_on: new Date().toISOString().slice(0, 10),
      jd: JD_UC,
      analysis: FIXTURES.analysis,
      resume_result: FIXTURES.resume,
      tailored_resume: resume.resume_markdown,
      outreach: FIXTURES.outreach,
    },
    {
      user_id: id,
      company: "Nestaway",
      role: "Operations Lead",
      location: "Bengaluru",
      company_type: "Rental housing",
      status: "saved",
      jd: JD_NEST,
      analysis: {
        company: "Nestaway",
        role: "Operations Lead",
        company_type: "Rental housing",
        location: "Bengaluru",
        seniority: "Mid-senior",
        hiring_contact: null,
        hiring_titles: ["Head of Operations", "Regional Operations Manager"],
        summary: "Run move-ins, maintenance and vendors across 3 cities.",
        top_skills: [
          { skill: "Multi-city operations", why: "Runs 3 cities", match: "strong", evidence: "Ran partner operations across 4 cities with 320 service partners", gap_note: null, how_to_show: null },
          { skill: "Vendor management", why: "Core of the role", match: "strong", evidence: "Managed last-mile vendors for 2 zones", gap_note: null, how_to_show: null },
          { skill: "Turnaround time and SLAs", why: "Main metric", match: "partial", evidence: null, gap_note: "No speed or SLA numbers on the resume.", how_to_show: "If you tracked how fast partners completed jobs, add the before/after." },
          { skill: "On-ground team leadership", why: "Leads city teams", match: "strong", evidence: "Led a team of 14 city executives", gap_note: null, how_to_show: null },
          { skill: "Excel reporting", why: "Weekly reviews", match: "strong", evidence: "Partner management, SQL, Excel, Process design", gap_note: null, how_to_show: null },
        ],
        ats_keywords: ["Operations Management", "Vendor Management", "SLA"],
        keywords_missing: ["SLA"],
        real_problem: "Move-ins and repairs are slow and inconsistent across cities, which hurts tenant ratings and renewals. They need someone to make vendors reliable and fix recurring issues.",
        unwritten_expectations: ["Comfort with escalations from tenants", "Hands-on visits to properties", "Simple weekly dashboards"],
        fit_score: 8,
        fit_verdict: "Strong fit; show turnaround results",
        fit_reasoning: "Multi-city partner operations and team leadership match closely. The resume shows churn results but not turnaround time or SLA improvements, which this role measures.",
        gaps: [
          { gap: "Turnaround time results", status: "not_shown", explanation: "You likely tracked it, but the resume has no numbers on speed.", how_to_close: "Add one turnaround number under QuickNest — e.g. average job completion time before and after your changes.", question: null },
          { gap: "Real-estate experience", status: "lacking", explanation: "Your background is home services, not rental housing.", how_to_close: "Don't stretch it. Bridge in the interview: both businesses run on reliable on-ground partners and fast fixes.", question: null },
          { gap: "Rate negotiation", status: "unsure", explanation: "No vendor rate or SLA negotiation is mentioned.", how_to_close: "If you negotiated partner rates or SLAs, say what you agreed and what it saved.", question: "Did you negotiate rates or SLAs with partners? What changed?" },
        ],
        questions: ["Did you negotiate rates or SLAs with partners? What changed?"],
      },
    },
  ]);
}
