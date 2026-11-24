import { openai } from "@/lib/ai";
import { isVoiceId, SPEECH_PRICE, TTS_MODEL } from "@/lib/models";
import { voiceGate } from "@/lib/voice-gate";

/** Claude voice: the AI's written reply -> natural speech (mp3 stream). */
export async function POST(req: Request) {
  const { sessionId, text, kind } = (await req.json()) as { sessionId?: string; text?: string; kind?: string };
  const g = await voiceGate(sessionId ?? null);
  if ("error" in g) return g.error;
  const input = (text ?? "").trim().slice(0, 4000);
  if (!input) return new Response(null, { status: 204 });
  const voice = isVoiceId(g.settings.voice_name) ? g.settings.voice_name : "marin";
  const who = kind === "negotiation" ? "an HR manager at an Indian company discussing an offer" : "a hiring manager at an Indian company running an interview";
  try {
    const res = await openai().audio.speech.create({
      model: TTS_MODEL,
      voice,
      input,
      response_format: "mp3",
      instructions: `Speak as ${who}: warm, professional, natural pace, like a real phone call. No reading tone.`,
    });
    // No usage is returned for speech; estimate from the text (~1,250 audio tokens per spoken minute, ~150 words a minute).
    const words = input.split(/\s+/).length;
    const textTok = Math.ceil(input.length / 4);
    const audioTok = Math.ceil((words / 150) * 1250);
    const cost = (textTok * SPEECH_PRICE.ttsTextIn + audioTok * SPEECH_PRICE.ttsAudioOut) / 1_000_000;
    await g.admin.from("usage_events").insert({ user_id: g.user.id, session_id: sessionId ?? null, feature: "voice", model: TTS_MODEL, input_tokens: textTok, output_tokens: audioTok, cost_usd: cost });
    return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("speak", err);
    return Response.json({ error: "Couldn't play the voice." }, { status: 500 });
  }
}
