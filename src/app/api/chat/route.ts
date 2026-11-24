import { currentUser } from "@/lib/current-user";
import { aiLimited, gateResponse } from "@/lib/rate-limit";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AI_MODELS, aiErrorMessage, checkLimits, logUsage, openai, humaniseText } from "@/lib/ai";
import { buildSystemPrompt, extractResume } from "@/lib/prompts";
import { DEMO, demoChat } from "@/lib/demo";
import type { Application, Message, Profile, Session } from "@/lib/types";

export const maxDuration = 300; // seconds - long resume rewrites can take a while

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const { sessionId, content, step } = (await req.json()) as {
    sessionId: string;
    content: string;
    step?: string | null;
  };
  if (!sessionId || !content?.trim()) {
    return Response.json({ error: "Missing message" }, { status: 400 });
  }

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", sessionId).single<Session>(),
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
  ]);
  if (!session || !profile) return Response.json({ error: "Session not found" }, { status: 404 });
  if (!profile.is_active) return Response.json({ error: "Your account is paused." }, { status: 403 });

  const admin = createServiceClient();
  const gate = await aiLimited(user.id, "chat", profile.feature_limits);
  if (gate) return gateResponse(gate, "chat");
  const limits = await checkLimits(admin, user.id, profile);
  if (limits.error) return Response.json({ error: limits.error }, { status: 402 });
  const model = limits.settings.model;

  let app: Application | null = null;
  if (session.application_id) {
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("id", session.application_id)
      .single<Application>();
    app = data;
  } else if (session.kind !== "linkedin" && (session.meta?.company || session.meta?.role)) {
    // Practice session for a job that isn't tracked as an application.
    app = {
      id: "",
      company: session.meta.company ?? "",
      role: session.meta.role ?? "",
      jd: session.meta.jd || "(No job description given - use the role and company type.)",
      company_type: session.meta.company_type ?? null,
    } as Application;
  }

  const { error: insertErr } = await supabase.from("messages").insert({
    session_id: sessionId,
    user_id: user.id,
    role: "user",
    content,
    step: step ?? null,
  });
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  const { data: history } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  // Merge consecutive same-role turns so roles always alternate.
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of history ?? []) {
    if (m.role === "assistant" && m.content.startsWith("⚠️")) continue; // skip error notes
    const last = messages[messages.length - 1];
    if (last && last.role === m.role) last.content = `${last.content}\n\n${m.content}`;
    else messages.push({ role: m.role, content: m.content });
  }

  const fileProfile =
    session.kind === "linkedin" && session.meta?.role ? { ...profile, target_role: session.meta.role } : profile;
  let system = buildSystemPrompt({ profile: fileProfile, app, kind: session.kind });
  const roleplay = session.kind === "interview" || session.kind === "negotiation";
  // Salary talk: reuse the offer check already shown on screen so the numbers never disagree.
  const oc = (session.meta as { offer_check?: { position?: string; counter_low?: string; counter_high?: string } } | null)?.offer_check;
  if (session.kind === "negotiation" && oc?.counter_low && oc?.counter_high) {
    system += `\n\nThe candidate already sees this offer check on screen: the offer is ${oc.position ?? "assessed"} market, realistic counter ${oc.counter_low} to ${oc.counter_high}. Use exactly this verdict and range; never state a different counter range.`;
  }
  // Hard stop for the mock interview: once Question 6 of 6 has been answered, the interview must end.
  if (session.kind === "interview") {
    let q6 = -1;
    messages.forEach((m, i) => { if (m.role === "assistant" && /question\s*6\s*of\s*6/i.test(m.content)) q6 = i; });
    if (q6 >= 0 && messages.slice(q6 + 1).some((m) => m.role === "user")) {
      system += "\n\nTHE INTERVIEW IS OVER. All 6 questions are done. Do not ask any more questions. Step out of character and give the final feedback now, in simple English: a score out of 10, the strongest moments, the weakest answers with the exact reason each was weak, and what a 9 out of 10 answer would have sounded like for each weak one.";
    }
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        if (DEMO || limits.demo) {
          const turn = (history ?? []).filter((m) => m.role === "assistant").length;
          for await (const w of demoChat(session.kind, turn)) {
            full += w;
            controller.enqueue(encoder.encode(w));
          }
          return;
        }
        // Role-play turns should feel instant; writing tasks get more thought.
        const effort = roleplay ? (AI_MODELS[model].noneEffort ? "none" : "low") : "medium";
        const stream = openai().responses.stream({
          model,
          instructions: system,
          input: messages,
          reasoning: { effort },
          max_output_tokens: 32000,
          prompt_cache_key: sessionId, // same session → cached resume/JD → cheaper
          safety_identifier: user.id,
          store: false,
        });
        for await (const event of stream) {
          if (event.type === "response.output_text.delta" || event.type === "response.refusal.delta") {
            const d = humaniseText(event.delta); // same plain punctuation as every other AI reply
            full += d;
            controller.enqueue(encoder.encode(d));
          }
        }
        const final = await stream.finalResponse();
        await logUsage(admin, { userId: user.id, sessionId, feature: "chat", model, usage: final.usage });
        if (final.status === "incomplete") {
          const note = "\n\n_(The answer was cut short. Say \"continue\" to get the rest.)_";
          full += note;
          controller.enqueue(encoder.encode(note));
        }
      } catch (err) {
        const msg = aiErrorMessage(err);
        console.error("chat error", err);
        const note = `${full ? "\n\n" : ""}⚠️ ${msg}`;
        full += note;
        controller.enqueue(encoder.encode(note));
      } finally {
        if (full.trim()) {
          await supabase.from("messages").insert({
            session_id: sessionId,
            user_id: user.id,
            role: "assistant",
            content: full,
            step: step ?? null,
          });
          await supabase.from("sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
          if (app?.id) {
            const resume = extractResume(full);
            await supabase
              .from("applications")
              .update({ updated_at: new Date().toISOString(), ...(resume ? { tailored_resume: resume } : {}) })
              .eq("id", app.id);
          }
        }
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
