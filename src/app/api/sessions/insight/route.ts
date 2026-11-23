import { createClient, createServiceClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/current-user";
import { aiErrorMessage, checkLimits, logUsage, runStructured } from "@/lib/ai";
import { INSIGHT_SCHEMAS, buildInsight } from "@/lib/tasks";
import type { Application, Message, Profile, Session } from "@/lib/types";

/** Builds the interview scorecard or the offer check for a practice session, and stores it on the session. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });
  const { sessionId, kind } = (await req.json()) as { sessionId?: string; kind?: keyof typeof INSIGHT_SCHEMAS };
  if (kind !== "interview_report" && kind !== "offer_check") return Response.json({ error: "Unknown request." }, { status: 400 });

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", sessionId ?? "").single<Session>(),
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
  ]);
  if (!session || !profile) return Response.json({ error: "Session not found." }, { status: 404 });
  if (!profile.is_active) return Response.json({ error: "Your account is paused." }, { status: 403 });

  let app: Application | null = null;
  if (session.application_id) {
    const { data } = await supabase.from("applications").select("*").eq("id", session.application_id).single<Application>();
    app = data;
  }
  let transcript = "";
  if (kind === "interview_report") {
    const { data: msgs } = await supabase.from("messages").select("role, content, step").eq("session_id", session.id).order("created_at").returns<Message[]>();
    const turns = (msgs ?? []).filter((m) => !(m.role === "user" && m.step));
    if (turns.filter((m) => m.role === "user").length < 2) return Response.json({ error: "Answer at least two questions first." }, { status: 400 });
    transcript = turns.map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`).join("\n").slice(-60000);
  }

  const admin = createServiceClient();
  const limits = await checkLimits(admin, user.id, profile);
  if (limits.error) return Response.json({ error: limits.error }, { status: 402 });
  const { instructions, input } = buildInsight(kind, { profile, app, transcript, offer: session.meta });
  try {
    const { data, usage } = await runStructured<Record<string, unknown>>({
      demo: limits.demo,
      model: limits.settings.model,
      name: kind,
      schema: INSIGHT_SCHEMAS[kind],
      instructions,
      input,
      effort: kind === "interview_report" ? "medium" : "low",
      userId: user.id,
    });
    await logUsage(admin, { userId: user.id, sessionId: session.id, feature: kind, model: limits.settings.model, usage });
    if (kind === "interview_report") data.score = Math.max(0, Math.min(10, Math.round(Number(data.score))));
    const meta = { ...(session.meta as Record<string, unknown>), [kind]: data, ...(kind === "interview_report" ? { report_turns: transcript.length } : {}) };
    await supabase.from("sessions").update({ meta }).eq("id", session.id);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: aiErrorMessage(e) }, { status: 500 });
  }
}
