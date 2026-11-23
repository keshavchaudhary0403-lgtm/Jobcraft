import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalisePhone, placeholderEmail } from "@/lib/phone";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Admins only" }, { status: 403 });
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, is_admin, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ users: data });
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
  const { id, password, is_active, is_admin } = (await req.json()) as {
    id: string;
    password?: string;
    is_active?: boolean;
    is_admin?: boolean;
  };
  const admin = createServiceClient();
  if (password) {
    if (password.length < 6) return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  const patch: Record<string, boolean> = {};
  if (typeof is_active === "boolean" && id !== me.id) patch.is_active = is_active;
  if (typeof is_admin === "boolean" && id !== me.id) patch.is_admin = is_admin;
  if (Object.keys(patch).length) {
    const { error } = await admin.from("profiles").update(patch).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ ok: true });
}
