import { createClient, createServiceClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/current-user";
import { checkLimits } from "@/lib/ai";
import type { Profile } from "@/lib/types";

/** Shared checks for the Claude voice endpoints: logged in, voice allowed, inside the spending limit. */
export async function voiceGate(sessionId: string | null) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return { error: Response.json({ error: "Please log in again." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile?.is_active) return { error: Response.json({ error: "Your account is paused." }, { status: 403 }) };
  if (!profile.voice_enabled) return { error: Response.json({ error: "Voice practice isn't switched on for your account. Ask your admin." }, { status: 403 }) };
  if (profile.ai_mode !== "real") return { error: Response.json({ error: "Voice practice needs Real AI on your account." }, { status: 403 }) };
  if (sessionId) {
    const { data: s } = await supabase.from("sessions").select("id").eq("id", sessionId).maybeSingle();
    if (!s) return { error: Response.json({ error: "Session not found." }, { status: 404 }) };
  }
  const admin = createServiceClient();
  const limits = await checkLimits(admin, user.id, profile);
  if (limits.error) return { error: Response.json({ error: limits.error }, { status: 402 }) };
  return { user, profile, admin, settings: limits.settings };
}
