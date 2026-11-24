import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { normalisePhone, placeholderEmail } from "@/lib/phone";
import { getSettings, monthStartIST, spendByUser } from "@/lib/ai";
import { cleanLimits } from "@/lib/features";

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Admins only" }, { status: 403 });
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, is_admin, is_active, monthly_limit_inr, ai_mode, is_demo, voice_enabled, feature_limits, created_at")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const settings = await getSettings(admin);
  const spend = await spendByUser(admin, settings.usd_to_inr);
  const users = data.map((u) => ({ ...u, spent_inr: spend[u.id] ?? 0 }));
  const total_spent_inr = Object.values(spend).reduce((a, b) => a + b, 0);
  const { data: ev } = await admin.from("usage_events").select("feature, cost_usd, user_id, created_at").gte("created_at", monthStartIST());
  const by_feature: Record<string, number> = {};
  const daily: Record<string, number> = {};
  const calls: Record<string, number> = {};
  const active = new Set<string>();
  for (const r of ev ?? []) {
    const inr = Number(r.cost_usd) * settings.usd_to_inr;
    by_feature[r.feature] = (by_feature[r.feature] ?? 0) + inr;
    calls[r.feature] = (calls[r.feature] ?? 0) + 1;
    // India date of the event
    const day = new Date(new Date(r.created_at).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    daily[day] = (daily[day] ?? 0) + inr;
    active.add(r.user_id);
  }
  // Which provider keys are set on the server (never the keys themselves).
  const keys = { openai: !!process.env.OPENAI_API_KEY, anthropic: !!process.env.ANTHROPIC_API_KEY };
  return Response.json({ users, settings: { ...settings, keys }, total_spent_inr, by_feature, daily, calls, active_users: active.size, events: ev?.length ?? 0 });
}

/** Create a user: name + (email and/or phone) + password. No email/OTP is sent. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Admins only" }, { status: 403 });
  const { full_name, email, phone, password } = (await req.json()) as Record<string, string | undefined>;
  const cleanPhone = phone?.trim() ? normalisePhone(phone) : null;
  const cleanEmail = email?.trim().toLowerCase() || null;
  if (!cleanEmail && !cleanPhone) return Response.json({ error: "Give an email or a phone number." }, { status: 400 });
  if (!password || password.length < 6) return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  const admin = createServiceClient();
  if (cleanPhone) {
    const { data: taken } = await admin.from("profiles").select("id").eq("phone", cleanPhone).maybeSingle();
    if (taken) return Response.json({ error: "That phone number is already used." }, { status: 409 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: cleanEmail ?? placeholderEmail(cleanPhone!),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name?.trim() || null, phone: cleanPhone },
  });
  if (error || !data.user) return Response.json({ error: error?.message ?? "Could not create user" }, { status: 400 });

  // The DB trigger creates the profile; make sure phone/name/email are set.
  await admin
    .from("profiles")
    .upsert({ id: data.user.id, full_name: full_name?.trim() || null, phone: cleanPhone, email: cleanEmail });
  return Response.json({ ok: true });
}

/** Reset password, pause/unpause, or make admin. */
export async function PATCH(req: Request) {
  const me = await requireAdmin();
  if (!me) return Response.json({ error: "Admins only" }, { status: 403 });
  const { id, password, is_active, is_admin, monthly_limit_inr, ai_mode, voice_enabled, feature_limits } = (await req.json()) as {
    id: string;
    password?: string;
    is_active?: boolean;
    is_admin?: boolean;
    monthly_limit_inr?: number | null; // null = use default
    ai_mode?: string;
    voice_enabled?: boolean;
    feature_limits?: Record<string, number | null>;
  };
  const admin = createServiceClient();
  if (password) {
    if (password.length < 6) return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (feature_limits !== undefined) {
    const clean = cleanLimits(feature_limits);
    if (!clean) return Response.json({ error: "Limits must be whole numbers, 0 or more." }, { status: 400 });
    patch.feature_limits = clean;
  }
  if (ai_mode !== undefined) {
    if (!["real", "demo", "off"].includes(ai_mode)) return Response.json({ error: "Unknown AI mode." }, { status: 400 });
    patch.ai_mode = ai_mode;
  }
  if (monthly_limit_inr !== undefined) {
    if (monthly_limit_inr !== null && !(Number(monthly_limit_inr) >= 0)) {
      return Response.json({ error: "Limit must be 0 or more." }, { status: 400 });
    }
    patch.monthly_limit_inr = monthly_limit_inr === null ? null : Number(monthly_limit_inr);
  }
  if (typeof voice_enabled === "boolean") patch.voice_enabled = voice_enabled;
  if (typeof is_active === "boolean" && id !== me.id) patch.is_active = is_active;
  if (typeof is_admin === "boolean" && id !== me.id) patch.is_admin = is_admin;
  if (Object.keys(patch).length) {
    const { error } = await admin.from("profiles").update(patch).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ ok: true });
}
