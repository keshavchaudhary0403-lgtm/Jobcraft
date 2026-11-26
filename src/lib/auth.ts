import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { normaliseBasics } from "@/lib/profile-format";

/**
 * Logged-in user + profile for server pages. Cached per request, so the layout and
 * the page share one lookup instead of repeating it.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  // getClaims verifies the session token locally (signing keys) - no extra network hop.
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single<Profile>();
  if (!profile) redirect("/login?e=noprofile");
  // Older profiles were free text ("15.5LPA", "about 4 years"). Store them in the one clean shape, once.
  const keys = ["full_name", "current_title", "target_role", "experience_years", "city", "current_ctc", "linkedin_url"] as const;
  const before = Object.fromEntries(keys.map((k) => [k, profile[k] ?? ""])) as Record<(typeof keys)[number], string>;
  const { value, errors } = normaliseBasics(before);
  const patch = Object.fromEntries(keys.filter((k) => !(k in errors) && value[k] !== before[k]).map((k) => [k, value[k] || null]));
  if (Object.keys(patch).length) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (!error) Object.assign(profile, patch);
  }
  // Profile photo URL lives in the user's own auth metadata (set from the Profile page).
  const meta = (data!.claims.user_metadata ?? {}) as { avatar_url?: unknown };
  const avatarUrl = typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("https://") ? meta.avatar_url : null;
  const user = { id, email: (data!.claims.email as string | undefined) ?? profile.email ?? undefined, avatarUrl };
  return { supabase, user, profile };
});

/** How complete the candidate file is - prompts are only as good as the inputs. */
export function profileGaps(p: Profile) {
  const gaps: string[] = [];
  if (!p.full_name) gaps.push("your name");
  if (!p.master_resume || p.master_resume.length < 200) gaps.push("your resume");
  if (!p.target_role) gaps.push("your target role");
  if (!p.strongest_proof) gaps.push("your strongest results");
  return gaps;
}
