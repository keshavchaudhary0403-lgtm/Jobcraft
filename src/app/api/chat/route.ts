import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { claude, MODEL } from "@/lib/claude";
import { buildSystemPrompt, extractResume } from "@/lib/prompts";
import type { Application, Message, Profile, Session } from "@/lib/types";

export const maxDuration = 300; // seconds — long resume rewrites can take a while

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      jd: session.meta.jd || "(No job description given — use the role and company type.)",
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
  const messages: Anthropic.MessageParam[] = [];
  for (const m of history ?? []) {
    const last = messages[messages.length - 1];
    if (last && last.role === m.role) last.content = `${last.content as string}\n\n${m.content}`;
    else messages.push({ role: m.role, content: m.content });
  }

  const fileProfile =
    session.kind === "linkedin" && session.meta?.role ? { ...profile, target_role: session.meta.role } : profile;
  const system = buildSystemPrompt({ profile: fileProfile, app, kind: session.kind });
  const roleplay = session.kind === "interview" || session.kind === "negotiation";

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        const stream = claude().beta.messages.stream({
          model: MODEL,
          max_tokens: 32000,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages,
          // Role-play turns should feel instant; writing tasks get more thought.
          output_config: { effort: roleplay ? "low" : "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          const note = "\n\n_(The AI declined to answer this one. Try rephrasing.)_";
          full += note;
          controller.enqueue(encoder.encode(note));
        }
      } catch (err) {
        const msg =
          err instanceof Anthropic.RateLimitError
            ? "Too many requests right now — wait a minute and try again."
            : err instanceof Anthropic.AuthenticationError
              ? "The AI key is not configured correctly (ANTHROPIC_API_KEY)."
              : err instanceof Anthropic.APIError
                ? `AI service error (${err.status ?? "network"}). Please try again.`
                : "Something went wrong. Please try again.";
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
