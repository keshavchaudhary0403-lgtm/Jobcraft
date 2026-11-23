import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Logged-in user + profile for server pages. Cached per request, so the layout and
 * the page share one lookup instead of repeating it.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  // getClaims verifies the session token locally (signing keys) — no extra network hop.
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single<Profile>();
  if (!profile) redirect("/login?e=noprofile");
  const user = { id, email: (data!.claims.email as string | undefined) ?? profile.email ?? undefined };
  return { supabase, user, profile };
});

/** How complete the candidate file is — prompts are only as good as the inputs. */
export function profileGaps(p: Profile) {
  const gaps: string[] = [];
  if (!p.full_name) gaps.push("your name");
  if (!p.master_resume || p.master_resume.length < 200) gaps.push("your resume");
  if (!p.target_role) gaps.push("your target role");
  if (!p.strongest_proof) gaps.push("your strongest results");
  return gaps;
}
