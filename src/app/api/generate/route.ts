import { currentUser } from "@/lib/current-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { aiErrorMessage, checkLimits, logUsage, runStructured } from "@/lib/ai";
import { buildTask, SCHEMAS, type Analysis, type LinkedInResult, type Outreach, type ResumeResult } from "@/lib/tasks";
import type { Application, Profile } from "@/lib/types";

export const maxDuration = 300;

type Body = { task: "analysis" | "resume" | "outreach" | "linkedin"; applicationId?: string; extra?: Record<string, string> };

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const { task, applicationId, extra } = (await req.json()) as Body;
  if (!(task in SCHEMAS) || task === ("parse_resume" as string)) return Response.json({ error: "Unknown task" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) return Response.json({ error: "Profile missing" }, { status: 404 });
  if (!profile.is_active) return Response.json({ error: "Your account is paused." }, { status: 403 });

  let app: Application | undefined;
  if (task !== "linkedin") {
    const { data } = await supabase.from("applications").select("*").eq("id", applicationId ?? "").single<Application>();
    if (!data) return Response.json({ error: "Job not found" }, { status: 404 });
    app = data;
  }

  const admin = createServiceClient();
  const limits = await checkLimits(admin, user.id, profile);
  if (limits.error) return Response.json({ error: limits.error }, { status: 402 });
  const model = limits.settings.model;

  const { instructions, input } = buildTask(task, { profile, app, extra });
  try {
    const { data, usage } = await runStructured<unknown>({
      demo: limits.demo,
      model,
      name: task,
      schema: SCHEMAS[task],
      instructions,
      input,
      effort: task === "analysis" || task === "resume" ? "medium" : "low",
      userId: user.id,
    });
    await logUsage(admin, { userId: user.id, feature: task, model, usage });

    const now = new Date().toISOString();
    if (task === "analysis") {
      const a = data as Analysis;
      a.fit_score = Math.max(0, Math.min(10, Math.round(a.fit_score)));
      a.scored_with = Object.fromEntries(Object.entries(app!.fit_answers ?? {}).filter(([, v]) => typeof v === "string" && v.trim()));
      await supabase
        .from("applications")
        .update({
          analysis: a,
          company: app!.company && app!.company !== "New job" ? app!.company : a.company,
          role: app!.role && app!.role !== "Analysing…" ? app!.role : a.role,
          company_type: app!.company_type ?? a.company_type,
          location: app!.location ?? a.location,
          seniority: a.seniority,
          hiring_contact: app!.hiring_contact ?? a.hiring_contact,
          updated_at: now,
        })
        .eq("id", app!.id);
    } else if (task === "resume") {
      const r = data as ResumeResult;
      await supabase.from("applications").update({ resume_result: r, tailored_resume: r.resume_markdown, updated_at: now }).eq("id", app!.id);
    } else if (task === "outreach") {
      await supabase
        .from("applications")
        .update({ outreach: data as Outreach, hiring_contact: extra?.contact || app!.hiring_contact, updated_at: now })
        .eq("id", app!.id);
    } else if (task === "linkedin") {
      await supabase.from("profiles").update({ linkedin_result: data as LinkedInResult }).eq("id", user.id);
    }
    return Response.json({ data });
  } catch (err) {
    console.error("generate", task, err);
    const msg = err instanceof Error && err.message.startsWith("The AI answer") ? err.message : aiErrorMessage(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
