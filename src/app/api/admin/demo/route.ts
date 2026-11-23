import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { ensureDemoUser, seedDemo } from "@/lib/demo-account";

/** Demo login controls: enable (creates the demo account on first use), disable, reset sample data. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Admins only" }, { status: 403 });
  const { action } = (await req.json()) as { action?: "enable" | "disable" | "reset" };
  const admin = createServiceClient();
  try {
    if (action === "enable") {
      await ensureDemoUser(admin);
      await admin.from("app_settings").upsert({ id: 1, demo_enabled: true, updated_at: new Date().toISOString() });
      return Response.json({ ok: true });
    }
    if (action === "disable") {
      await admin.from("app_settings").upsert({ id: 1, demo_enabled: false, updated_at: new Date().toISOString() });
      return Response.json({ ok: true });
    }
    if (action === "reset") {
      await seedDemo(admin, await ensureDemoUser(admin));
      return Response.json({ ok: true });
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
