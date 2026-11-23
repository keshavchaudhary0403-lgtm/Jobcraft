import { currentUser } from "@/lib/current-user";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkLimits, logUsage, runStructured, type ModelId } from "@/lib/ai";
import { buildTask, SCHEMAS, type DetectedJob } from "@/lib/tasks";

// Reading a title and company name is simple — always use the cheapest model.
const DETECT_MODEL: ModelId = "gpt-6-luna";

/** Paste a JD → company / role / location suggestions for the user to confirm. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });
  const { jd } = (await req.json()) as { jd?: string };
  if (!jd || jd.trim().split(/\s+/).length < 30) return Response.json({ data: null });

  const { data: profile } = await supabase.from("profiles").select("is_active, monthly_limit_inr, ai_mode").eq("id", user.id).single();
  if (!profile?.is_active) return Response.json({ data: null });
  const admin = createServiceClient();
  const limits = await checkLimits(admin, user.id, profile);
  if (limits.error) return Response.json({ data: null });

  const { instructions, input } = buildTask("detect_job", { profile: {} as never, extra: { jd: jd.slice(0, 12000) } });
  try {
    const { data, usage } = await runStructured<DetectedJob>({
      demo: limits.demo,
      model: DETECT_MODEL,
      name: "detect_job",
      schema: SCHEMAS.detect_job,
      instructions,
      input: input as string,
      effort: "none",
      userId: user.id,
    });
    await logUsage(admin, { userId: user.id, feature: "detect_job", model: DETECT_MODEL, usage });
    return Response.json({ data });
  } catch {
    return Response.json({ data: null });
  }
}
