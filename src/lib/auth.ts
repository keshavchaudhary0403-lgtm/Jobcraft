import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Use in server components/pages: returns supabase client, user and profile, or redirects to /login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login?e=noprofile");
  return { supabase, user, profile };
}

/** How complete the candidate file is — prompts are only as good as the inputs. */
export function profileGaps(p: Profile) {
  const gaps: string[] = [];
  if (!p.full_name) gaps.push("your name");
  if (!p.master_resume || p.master_resume.length < 200) gaps.push("your resume");
  if (!p.target_role) gaps.push("your target role");
  if (!p.strongest_proof) gaps.push("your strongest results");
  return gaps;
}
