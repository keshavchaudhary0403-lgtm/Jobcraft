import { cleanBasics } from "@/lib/profile-format";
import { currentUser } from "@/lib/current-user";
import { aiLimited, gateResponse } from "@/lib/rate-limit";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { aiErrorMessage, checkLimits, logUsage, runStructured } from "@/lib/ai";
import { buildTask, SCHEMAS, type ParsedResume } from "@/lib/tasks";
import type { Profile } from "@/lib/types";

export const maxDuration = 120;

/** Drop a resume (PDF or pasted text) → structured details to review. Nothing is saved here. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile?.is_active) return Response.json({ error: "Your account is paused." }, { status: 403 });
  const admin = createServiceClient();
  const gate = await aiLimited(user.id, "parse", profile.feature_limits);
  if (gate) return gateResponse(gate, "parse");
  const limits = await checkLimits(admin, user.id, profile);
  if (limits.error) return Response.json({ error: limits.error }, { status: 402 });
  const model = limits.settings.model;

  const form = await req.formData();
  const file = form.get("file");
  const text = (form.get("text") as string | null)?.trim();
  const { instructions } = buildTask("parse_resume", { profile, extra: { resume_text: "" } });

  let input: Parameters<typeof runStructured>[0]["input"];
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return Response.json({ error: "Please upload a PDF." }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return Response.json({ error: "PDF must be under 8 MB." }, { status: 400 });
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    input = { pdf: { base64: data, filename: file.name || "resume.pdf" }, text: "This is my resume." };
  } else if (text && text.length > 100) {
    input = text;
  } else {
    return Response.json({ error: "Add a PDF or paste your resume." }, { status: 400 });
  }

  try {
    const { data, usage } = await runStructured<ParsedResume>({
      demo: limits.demo,
      model,
      name: "parse_resume",
      schema: SCHEMAS.parse_resume,
      instructions,
      input,
      effort: "low",
      userId: user.id,
    });
    await logUsage(admin, { userId: user.id, feature: "resume_import", model, usage });
    return Response.json({ data: cleanBasics(data) });
  } catch (err) {
    console.error("resume parse", err);
    return Response.json({ error: aiErrorMessage(err) }, { status: 500 });
  }
}
