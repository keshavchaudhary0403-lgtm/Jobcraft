import { createClient, createServiceClient } from "@/lib/supabase/server";
import { DEMO_EMAIL } from "@/lib/demo-account";

/** Is the demo login switched on? (public) */
export async function GET() {
  const admin = createServiceClient();
  const { data } = await admin.from("app_settings").select("demo_enabled").eq("id", 1).maybeSingle();
  return Response.json({ enabled: !!data?.demo_enabled });
}

/** Sign the visitor into the shared demo account — no password needed. */
export async function POST() {
  const admin = createServiceClient();
  const { data: settings } = await admin.from("app_settings").select("demo_enabled").eq("id", 1).maybeSingle();
  if (!settings?.demo_enabled) return Response.json({ error: "The demo is switched off right now." }, { status: 403 });
  const { data: demo } = await admin.from("profiles").select("id, is_active").eq("is_demo", true).maybeSingle();
  if (!demo?.is_active) return Response.json({ error: "The demo isn't available right now." }, { status: 403 });

  // One-time sign-in token generated server-side, then exchanged for a session cookie.
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
  if (error || !link.properties?.hashed_token) return Response.json({ error: "Couldn't open the demo. Try again." }, { status: 500 });
  const supabase = await createClient();
  const { error: vErr } = await supabase.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (vErr) return Response.json({ error: "Couldn't open the demo. Try again." }, { status: 500 });
  return Response.json({ ok: true });
}
