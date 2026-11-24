import { currentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { currentFileUrl } from "@/lib/resume-file";

/** Opens the user's own uploaded resume PDF (a 2-minute private link). */
export async function GET() {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });
  const url = await currentFileUrl(user.id);
  if (!url) return Response.json({ error: "No uploaded resume yet" }, { status: 404 });
  return Response.redirect(url, 302);
}
