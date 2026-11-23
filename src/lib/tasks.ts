/**
 * Structured AI tasks. Each one carries the method from the "Get Hired Faster" prompt library
 * as backend instructions and returns JSON the UI renders as real components.
 * Users never see these prompts.
 */
import type { Application, Profile } from "./types";

const TRUTH_RULE =
  "Only what's true. Never add a skill, tool, number, employer, date, project or claim the candidate can't back up in a real interview. Reframe what's true; never invent. Simple, clear English. No buzzwords.";

const str = { type: "string" } as const;
const nstr = { type: ["string", "null"] } as const;
const arr = (items: object) => ({ type: "array", items });
const obj = (properties: Record<string, object>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

// ───────────────────────── Types the UI renders ─────────────────────────
export type ParsedResume = {
  resume_text: string;
  full_name: string | null;
  current_title: string | null;
  target_role: string | null;
  experience_years: string | null;
  city: string | null;
  strongest_proof: string | null;
  skills: string[];
  linkedin_url: string | null;
};

export type Analysis = {
  company: string;
  role: string;
  company_type: string | null;
  location: string | null;
  seniority: string | null;
  hiring_contact: string | null;
  summary: string;
  top_skills: { skill: string; why: string; match: "strong" | "partial" | "missing" }[];
  ats_keywords: string[];
  real_problem: string;
  unwritten_expectations: string[];
  fit_score: number;
  fit_verdict: string;
  fit_reasoning: string;
  gaps: { gap: string; status: "lacking" | "not_shown" | "unsure"; explanation: string }[];
  questions: string[];
};

export type ResumeResult = {
  resume_markdown: string;
  changes: { change: string; why: string }[];
  missing_numbers: string[];
};

export type Outreach = { connection_note: string; message: string };
export type LinkedInResult = { headlines: string[]; about: string; skills: string[] };

// ───────────────────────── Schemas ─────────────────────────
export const SCHEMAS = {
  parse_resume: obj({
    resume_text: str,
    full_name: nstr,
    current_title: nstr,
    target_role: nstr,
    experience_years: nstr,
    city: nstr,
    strongest_proof: nstr,
    skills: arr(str),
    linkedin_url: nstr,
  }),
  analysis: obj({
    company: str,
    role: str,
    company_type: nstr,
    location: nstr,
    seniority: nstr,
    hiring_contact: nstr,
    summary: str,
    top_skills: arr(obj({ skill: str, why: str, match: { type: "string", enum: ["strong", "partial", "missing"] } })),
    ats_keywords: arr(str),
    real_problem: str,
    unwritten_expectations: arr(str),
    fit_score: { type: "integer" },
    fit_verdict: str,
    fit_reasoning: str,
    gaps: arr(obj({ gap: str, status: { type: "string", enum: ["lacking", "not_shown", "unsure"] }, explanation: str })),
    questions: arr(str),
  }),
  resume: obj({
    resume_markdown: str,
    changes: arr(obj({ change: str, why: str })),
    missing_numbers: arr(str),
  }),
  outreach: obj({ connection_note: str, message: str }),
  linkedin: obj({ headlines: arr(str), about: str, skills: arr(str) }),
};

export type TaskName = keyof typeof SCHEMAS;

// ───────────────────────── Context blocks ─────────────────────────
function candidateBlock(p: Profile) {
  return [
    "=== CANDIDATE ===",
    p.full_name && `Name: ${p.full_name}`,
    p.current_title && `Current title: ${p.current_title}`,
    p.target_role && `Target role: ${p.target_role}`,
    p.experience_years && `Experience: ${p.experience_years}`,
    p.city && `City: ${p.city}`,
    p.strongest_proof && `Strongest proof: ${p.strongest_proof}`,
    p.extra_notes && `Other true facts: ${p.extra_notes}`,
    "--- RESUME ---",
    p.master_resume || "(no resume)",
  ]
    .filter(Boolean)
    .join("\n");
}

function jobBlock(a: Application) {
  return ["=== JOB DESCRIPTION ===", a.job_url && `Listing: ${a.job_url}`, a.jd].filter(Boolean).join("\n");
}

function answersBlock(a: Application) {
  const entries = Object.entries(a.fit_answers ?? {}).filter(([, v]) => v?.trim());
  if (!entries.length) return "";
  return "=== CANDIDATE'S ANSWERS TO EARLIER QUESTIONS (true facts) ===\n" + entries.map(([q, v]) => `Q: ${q}\nA: ${v}`).join("\n\n");
}

// ───────────────────────── Instructions per task ─────────────────────────
export function buildTask(
  task: TaskName,
  ctx: { profile: Profile; app?: Application; extra?: Record<string, string> },
): { instructions: string; input: string } {
  const { profile, app, extra } = ctx;
  switch (task) {
    case "parse_resume":
      return {
        instructions: `Read the resume and fill the fields.
- resume_text: the full resume as clean plain text. Keep every word, number and date exactly. Section headings in CAPS, bullets as "- ".
- target_role: the most likely next role plus industry, e.g. "Digital Marketing Manager in e-commerce / D2C".
- experience_years: e.g. "about 4 years", from the dates.
- strongest_proof: the 1–2 strongest results that have real numbers, copied faithfully, one line.
- skills: up to 12 skills or tools actually named in the resume.
Use null when the resume doesn't say. ${TRUTH_RULE}`,
        input: extra?.resume_text ?? "",
      };

    case "analysis":
      return {
        instructions: `You are an experienced recruiter hiring in India. Analyse the job description, then compare the candidate's resume against it. Be brutally honest, not flattering.
Fill:
- company, role (from the JD; best guess if missing), company_type (startup / MNC / agency / D2C… or null), location, seniority, hiring_contact (the hiring manager or recruiter if the JD names one — e.g. "reports to Ananya Rao, Head of Growth" → "Ananya Rao, Head of Growth"; else null).
- summary: one short line on what this role is.
- top_skills: the 5 most important skills or experiences, ranked by how heavily the JD emphasises them. "why": a few words. "match": how well the resume shows it.
- ats_keywords: the 3 keywords most likely used to filter resumes for this role in an ATS.
- real_problem: one short paragraph — what problem is this company really trying to solve with this hire?
- unwritten_expectations: 3 things NOT written in the JD that this company almost certainly expects.
- fit_score: 0–10, honest. fit_verdict: a few words. fit_reasoning: 2–3 sentences.
- gaps: the top 3 gaps. status "lacking" = the candidate truly lacks it; "not_shown" = they likely have it but the resume fails to show it; "unsure" = you can't tell.
- questions: for every "unsure" gap (and anything else you need), a specific question to ask the candidate. Keep each under 25 words.
If the candidate already answered questions below, use those answers and don't ask again.
${TRUTH_RULE}`,
        input: [candidateBlock(profile), jobBlock(app!), answersBlock(app!)].filter(Boolean).join("\n\n"),
      };

    case "resume": {
      const a = app!.analysis as Analysis | null;
      return {
        instructions: `Rewrite the candidate's resume for this specific job. Rules:
1. Do not invent any skill, tool, number, employer, date, or project. Only reframe what is already true.
2. Reorder and rewrite bullet points so the most relevant experience for THIS role comes first.
3. Naturally include these keywords only where genuinely true: ${a?.ats_keywords?.join(", ") || "the JD's key terms"}.
4. Every bullet: action verb + what they did + measurable result. If a number is missing, keep the bullet honest without a number and add a question to missing_numbers asking for it. Never invent numbers.
5. One page, simple formatting, no tables, no graphics, no photo — ATS-safe.
6. Simple, clear English.
resume_markdown: the full resume in Markdown (# Name, contact line, ## section headings, "- " bullets).
changes: every change you made and why, so the candidate can verify each is true.
missing_numbers: questions for numbers that would make bullets stronger (empty if none).`,
        input: [
          candidateBlock(profile),
          jobBlock(app!),
          answersBlock(app!),
          extra?.numbers && `=== NUMBERS THE CANDIDATE JUST GAVE ===\n${extra.numbers}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      };
    }

    case "outreach":
      return {
        instructions: `Write LinkedIn outreach to the person hiring for this role${extra?.contact ? ` (${extra.contact})` : " (hiring manager or recruiter)"}. Goal: show the candidate understands THEIR business and can solve a real problem — not just list history.
connection_note: under 250 characters, two short lines: one warm, specific, concrete line about their company or work; one friendly line saying they'd love to connect and follow what they're building. Do NOT pitch or mention the job.
message: under 110 words, for after they accept or as a cold InMail:
- one short warm opening line of genuine interest in the role;
- one line naming a REAL, specific challenge this company likely faces, drawn only from the JD and their business;
- one or two lines connecting the candidate's single strongest real result to exactly that challenge;
- a confident close (e.g. would love to be considered / walk them through how they'd approach it). NO hedging like "if relevant".
NO abstract theory, NO lecturing, NO buzzwords, NO flattery, NO hedging. ${TRUTH_RULE}`,
        input: [candidateBlock(profile), jobBlock(app!)].join("\n\n"),
      };

    case "linkedin":
      return {
        instructions: `Rewrite the candidate's LinkedIn for the target role: ${extra?.role || profile.target_role || "their next role"}.
headlines: 3 options, each under 220 characters, leading with the exact terms a recruiter would type to find someone for this role. No buzzwords like "passionate", "dynamic", "results-driven".
about: under 150 words, first person. The first 2 lines must work as a hook on their own (LinkedIn hides the rest). End with what they're looking for. Use line breaks between short paragraphs.
skills: the top 5 skills to add and pin — what recruiters in this field actually search and filter by — only if true from the resume.
${TRUTH_RULE}`,
        input: candidateBlock(profile),
      };
  }
}
