import type { SupabaseClient } from "@supabase/supabase-js";

/** Logged-in user id from the session token, verified locally (fast). Null if not logged in. */
export async function currentUser(supabase: SupabaseClient): Promise<{ id: string } | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? { id: data.claims.sub } : null;
}
