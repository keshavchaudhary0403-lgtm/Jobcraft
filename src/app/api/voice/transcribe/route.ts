import { openai } from "@/lib/ai";
import { SPEECH_PRICE, TRANSCRIBE_MODEL } from "@/lib/models";
import { voiceGate } from "@/lib/voice-gate";

/** Claude voice: the candidate's spoken answer -> text. */
export async function POST(req: Request) {
  const form = await req.formData();
  const sessionId = (form.get("sessionId") as string | null) ?? null;
  const g = await voiceGate(sessionId);
  if ("error" in g) return g.error;
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size < 1000) return Response.json({ text: "" });
  if (audio.size > 10 * 1024 * 1024) return Response.json({ error: "That answer was too long. Keep it under two minutes." }, { status: 400 });
  try {
    const res = await openai().audio.transcriptions.create({ file: audio, model: TRANSCRIBE_MODEL, language: "en" });
    const u = res.usage;
    let cost = 0, inTok = 0, outTok = 0;
    if (u?.type === "tokens") {
      const audioIn = u.input_token_details?.audio_tokens ?? u.input_tokens;
      inTok = u.input_tokens;
      outTok = u.output_tokens;
      cost = (audioIn * SPEECH_PRICE.transcribeAudioIn + (u.input_tokens - audioIn) * SPEECH_PRICE.transcribeTextIn + u.output_tokens * SPEECH_PRICE.transcribeOut) / 1_000_000;
    } else if (u?.type === "duration") {
      cost = (u.seconds / 60) * 0.003;
    }
    await g.admin.from("usage_events").insert({ user_id: g.user.id, session_id: sessionId, feature: "voice", model: TRANSCRIBE_MODEL, input_tokens: inTok, output_tokens: outTok, cost_usd: cost });
    return Response.json({ text: res.text.trim() });
  } catch (err) {
    console.error("transcribe", err);
    return Response.json({ error: "Couldn't hear that. Try again." }, { status: 500 });
  }
}
