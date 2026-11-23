import { createClient, createServiceClient } from "@/lib/supabase/server";
import { aiLimited } from "@/lib/rate-limit";
import { currentUser } from "@/lib/current-user";
import { checkLimits, openai } from "@/lib/ai";
import { buildPrompt, buildSystemPrompt, type NegotiationInputs } from "@/lib/prompts";
import { REALTIME_MODEL, TRANSCRIBE_MODEL, isVoiceId } from "@/lib/models";
import type { Application, Message, Profile, Session } from "@/lib/types";

/**
 * Starts a realistic-voice practice call. Returns a short-lived client secret the browser
 * uses to connect to OpenAI Realtime over WebRTC — our API key never leaves the server.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });
  const { sessionId } = (await req.json()) as { sessionId?: string };

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", sessionId ?? "").single<Session>(),
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
  ]);
  if (!session || !profile) return Response.json({ error: "Session not found." }, { status: 404 });
  if (session.kind !== "interview" && session.kind !== "negotiation") return Response.json({ error: "Voice is for interview and salary practice." }, { status: 400 });
  if (!profile.is_active) return Response.json({ error: "Your account is paused." }, { status: 403 });
  if (!profile.voice_enabled) return Response.json({ error: "Realistic voice isn't switched on for your account. Ask your admin." }, { status: 403 });
  if (profile.ai_mode !== "real") return Response.json({ error: "Realistic voice needs Real AI on your account." }, { status: 403 });

  const admin = createServiceClient();
  if (await aiLimited(user.id, "voice")) return Response.json({ error: "That's a lot of calls in an hour — take a break and try again later." }, { status: 429 });
  const limits = await checkLimits(admin, user.id, profile);
  if (limits.error) return Response.json({ error: limits.error }, { status: 402 });

  let app: Application | null = null;
  if (session.application_id) {
    const { data } = await supabase.from("applications").select("*").eq("id", session.application_id).single<Application>();
    app = data;
  } else if (session.meta.company || session.meta.role) {
    app = { company: session.meta.company, role: session.meta.role } as Application;
  }
  const { data: history } = await supabase.from("messages").select("role, content, step").eq("session_id", session.id).order("created_at").returns<Message[]>();
  const spoken = (history ?? []).filter((m) => !(m.role === "user" && m.step));

  const kind = session.kind;
  const rules =
    kind === "interview"
      ? buildPrompt("mock_interview", { profile, app }).replace(/Begin when I say "ready"\.?/, "") +
        `\n\nThis is a live voice call. You ARE the hiring manager — never mention roles, modes or that this is practice. Speak naturally, warm but professional: short turns, exactly one question per turn, then stop and listen. Never read out lists or markdown.
Count your main questions (follow-ups don't count). After the 6th main question has been answered, thank the candidate, end the interview, and tell them their written scorecard is ready on screen. Do NOT read the feedback aloud.
${spoken.length ? "We are continuing an interview already in progress — pick up naturally from where it stopped." : "Start right away: greet the candidate in one short sentence, then ask your first question."}`
      : buildPrompt("negotiation", { profile, app, negotiation: session.meta as unknown as NegotiationInputs }) +
        `\n\nThis is a live voice call. The candidate already sees your market analysis on screen, so skip step 1 out loud.
You ARE the HR manager from your very first word — never mention roles, modes or that this is practice. Open warmly, state the offer, and ask one question. Push back like real HR: one objection or question per turn, two or three short sentences, then stop and let the candidate talk. When the candidate says "stop", give two or three sentences of spoken feedback and one thing to improve.`;

  const instructions = [
    buildSystemPrompt({ profile, app, kind }),
    "",
    "=== HOW THIS CALL WORKS ===",
    rules,
    spoken.length ? `\n=== CONVERSATION SO FAR ===\n${spoken.map((m) => `${m.role === "user" ? "Candidate" : "You"}: ${m.content}`).join("\n")}` : "",
  ].join("\n");

  try {
    const voice = isVoiceId(limits.settings.voice_name) ? limits.settings.voice_name : "marin";
    const secret = await openai().realtime.clientSecrets.create({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions,
        output_modalities: ["audio"],
        max_output_tokens: 1500,
        audio: {
          input: { transcription: { model: TRANSCRIBE_MODEL, language: "en" }, noise_reduction: { type: "near_field" } },
          output: { voice },
        },
      },
    });
    return Response.json({ secret: secret.value, model: REALTIME_MODEL, resumed: spoken.length > 0 });
  } catch (e) {
    console.error("voice secret", e);
    return Response.json({ error: "Couldn't start the voice call. Try again in a moment." }, { status: 500 });
  }
}
