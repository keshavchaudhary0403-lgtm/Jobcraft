import { createClient, createServiceClient } from "@/lib/supabase/server";
import { looksLikeEmail, normalisePhone } from "@/lib/phone";
import { rateLimited } from "@/lib/rate-limit";

const GENERIC = "Wrong email/phone or password.";

/**
 * Email OR phone + password login.
 * Phone numbers are looked up server-side (service role) to find the account,
 * so no SMS provider / OTP is needed.
 */
export async function POST(req: Request) {
  if (rateLimited(req, "login", 10, 5 * 60_000)) {
    return Response.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }
  const { identifier, password } = (await req.json()) as { identifier?: string; password?: string };
  if (!identifier?.trim() || !password) {
    return Response.json({ error: "Enter your email or phone and password." }, { status: 400 });
  }
  const supabase = await createClient();
  const id = identifier.trim();

  let credentials: { email: string; password: string } | { phone: string; password: string };

  if (looksLikeEmail(id)) {
    credentials = { email: id.toLowerCase(), password };
  } else {
    const phone = normalisePhone(id);
    if (phone.length < 10) return Response.json({ error: GENERIC }, { status: 401 });
    const admin = createServiceClient();
    const last10 = phone.slice(-10);
    const { data: rows } = await admin.from("profiles").select("id, phone").like("phone", `%${last10}`).limit(5);
    const match = rows?.find((r) => r.phone === phone) ?? (rows?.length === 1 ? rows[0] : null);
    if (!match) return Response.json({ error: GENERIC }, { status: 401 });
    const { data } = await admin.auth.admin.getUserById(match.id);
    const authUser = data?.user;
    if (!authUser) return Response.json({ error: GENERIC }, { status: 401 });
    credentials = authUser.email
      ? { email: authUser.email, password }
      : { phone: authUser.phone ?? phone, password };
  }

  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error || !data.user) return Response.json({ error: GENERIC }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).single();
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    return Response.json({ error: "Your account is paused. Contact the admin." }, { status: 403 });
  }
  return Response.json({ ok: true });
}
