import { createServiceClient } from "@/lib/supabase/server";
import { isModelId } from "@/lib/ai";
import { isVoiceId } from "@/lib/models";
import { cleanLimits } from "@/lib/features";
import { requireAdmin } from "@/lib/admin";

/** Update app-wide AI settings: model, default per-user limit, total budget, ₹ rate. */
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Admins only" }, { status: 403 });
  const body = (await req.json()) as {
    ai_model?: string;
    default_monthly_limit_inr?: number | null;
    total_monthly_limit_inr?: number | null;
    usd_to_inr?: number;
    fx_auto?: boolean;
    voice_name?: string;
    feature_limits?: Record<string, number | null>;
  };
  const patch: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
  if (body.ai_model !== undefined) {
    if (!isModelId(body.ai_model)) return Response.json({ error: "Unknown model" }, { status: 400 });
    patch.ai_model = body.ai_model;
  }
  for (const k of ["default_monthly_limit_inr", "total_monthly_limit_inr"] as const) {
    if (body[k] !== undefined) {
      if (body[k] !== null && !(Number(body[k]) >= 0)) return Response.json({ error: "Limits must be 0 or more." }, { status: 400 });
      patch[k] = body[k] === null ? null : Number(body[k]);
    }
  }
  if (body.feature_limits !== undefined) {
    const clean = cleanLimits(body.feature_limits);
    if (!clean) return Response.json({ error: "Limits must be whole numbers, 0 or more." }, { status: 400 });
    patch.feature_limits = clean;
  }
  if (body.voice_name !== undefined) {
    if (!isVoiceId(body.voice_name)) return Response.json({ error: "Unknown voice" }, { status: 400 });
    patch.voice_name = body.voice_name;
  }
  if (body.usd_to_inr !== undefined) {
    if (!(Number(body.usd_to_inr) > 0)) return Response.json({ error: "Rate must be more than 0." }, { status: 400 });
    patch.usd_to_inr = Number(body.usd_to_inr);
    patch.fx_auto = false; // typing a rate means "use my rate"
    patch.fx_source = "manual";
  }
  if (body.fx_auto !== undefined) {
    patch.fx_auto = !!body.fx_auto;
    if (body.fx_auto) patch.fx_updated_at = null; // forces a live refresh on next load
  }
  const { error } = await createServiceClient().from("app_settings").upsert(patch);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
