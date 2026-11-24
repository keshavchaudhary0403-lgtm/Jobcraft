import { createClient, createServiceClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/current-user";
import { REALTIME_MODEL, realtimeCostUsd, type RealtimeUsage } from "@/lib/models";

/** Saves one spoken turn (transcript) and/or the cost of one realtime response. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });
  const body = (await req.json()) as { sessionId?: string; role?: "user" | "assistant"; content?: string; usage?: RealtimeUsage };

  const { data: session } = await supabase.from("sessions").select("id").eq("id", body.sessionId ?? "").single();
  if (!session) return Response.json({ error: "Session not found." }, { status: 404 });

  if (body.role && body.content?.trim()) {
    await supabase.from("messages").insert({ session_id: session.id, user_id: user.id, role: body.role, content: body.content.trim().slice(0, 8000), step: "voice" });
    await supabase.from("sessions").update({ updated_at: new Date().toISOString() }).eq("id", session.id);
  }
  if (body.usage) {
    const cost = realtimeCostUsd(body.usage);
    const i = body.usage.input_token_details ?? {};
    const o = body.usage.output_token_details ?? {};
    await createServiceClient().from("usage_events").insert({
      user_id: user.id,
      session_id: session.id,
      feature: "voice",
      model: REALTIME_MODEL,
      input_tokens: (i.text_tokens ?? 0) + (i.audio_tokens ?? 0),
      cached_tokens: i.cached_tokens ?? 0,
      output_tokens: (o.text_tokens ?? 0) + (o.audio_tokens ?? 0),
      cost_usd: Math.min(cost, 1), // one response can never plausibly cost more than $1
    });
  }
  return Response.json({ ok: true });
}
