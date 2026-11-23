import type { Profile } from "./types";

export type ProfileDraft = Pick<
  Profile,
  "full_name" | "current_title" | "target_role" | "experience_years" | "city" | "strongest_proof" | "master_resume" | "linkedin_url" | "current_ctc" | "extra_notes"
> & { skills: string[] };

export function draftFrom(p: Partial<Profile>): ProfileDraft {
  return {
    full_name: p.full_name ?? "",
    current_title: p.current_title ?? "",
    target_role: p.target_role ?? "",
    experience_years: p.experience_years ?? "",
    city: p.city ?? "",
    strongest_proof: p.strongest_proof ?? "",
    master_resume: p.master_resume ?? "",
    linkedin_url: p.linkedin_url ?? "",
    current_ctc: p.current_ctc ?? "",
    extra_notes: p.extra_notes ?? "",
    skills: p.skills ?? [],
  };
}

