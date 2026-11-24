export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  target_role: string | null;
  experience_years: string | null;
  city: string | null;
  current_ctc: string | null;
  master_resume: string | null;
  strongest_proof: string | null;
  linkedin_url: string | null;
  extra_notes: string | null;
  monthly_limit_inr: number | null;
  current_title: string | null;
  skills: string[] | null;
  linkedin_result: unknown;
  onboarded: boolean;
  ai_mode: "real" | "demo" | "off";
  is_demo: boolean;
  voice_enabled: boolean;
  feature_limits: Partial<Record<string, number>> | null;
  /** null = app default. */
  ai_model?: string | null;
};

export const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"] as const;
export type Status = (typeof STATUSES)[number];

export type Application = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  job_url: string | null;
  jd: string;
  company_type: string | null;
  hiring_contact: string | null;
  status: Status;
  applied_on: string | null;
  notes: string | null;
  tailored_resume: string | null;
  location: string | null;
  seniority: string | null;
  analysis: unknown;
  fit_answers: Record<string, string>;
  resume_result: unknown;
  outreach: unknown;
  created_at: string;
  updated_at: string;
};

export type SessionKind = "workspace" | "linkedin" | "interview" | "negotiation";

export type Session = {
  id: string;
  user_id: string;
  application_id: string | null;
  kind: SessionKind;
  title: string | null;
  meta: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  step: string | null;
  created_at: string;
};
