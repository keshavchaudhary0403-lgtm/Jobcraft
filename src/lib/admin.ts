import { currentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";

/** Returns the logged-in user if they are an admin, else null. */
export async function requireAdmin() {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin ? user : null;
}
