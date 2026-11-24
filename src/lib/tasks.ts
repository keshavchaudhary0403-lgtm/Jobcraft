/**
 * Structured AI tasks. Each one carries the method from the "Get Hired Faster" prompt library
 * as backend instructions and returns JSON the UI renders as real components.
 * Users never see these prompts.
 */
import type { Application, Profile } from "./types";

const CLEAN_RULE = "Field values must be clean text only - never add notes like \"(inferred)\", \"(likely)\" or explanations inside a value.";
const TRUTH_RULE =
  "Only what's true. Never add a skill, tool, number, employer, date, project or claim the candidate can't back up in a real interview. Reframe what's true; never invent. Simple, clear English. No buzzwords. Write like a person, not an AI: never use em dashes or en dashes (use a comma, a full stop or a plain hyphen), no curly quotes, no ellipsis characters.";

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
  top_skills: {
    skill: string;
    why: string;
    match: "strong" | "partial" | "missing";
    /** Exact words from the resume that show it (null if nothing does). Newer analyses only. */
    evidence?: string | null;
    /** What the resume doesn't show yet (null when strong). */
    gap_note?: string | null;
    /** One concrete, truthful way to show it (null when strong). */
    how_to_show?: string | null;
  }[];
  ats_keywords: string[];
  /** ATS keywords that don't appear on the resume yet. */
  keywords_missing?: string[];
  real_problem: string;
  unwritten_expectations: string[];
  fit_score: number;
  fit_verdict: string;
  fit_reasoning: string;
  gaps: {
    gap: string;
    status: "lacking" | "not_shown" | "unsure";
    explanation: string;
    /** Honest plan to close or handle this gap. */
    how_to_close?: string;
    /** The question that would settle this gap (unsure / missing numbers), else null. */
    question?: string | null;
  }[];
  questions: string[];
  /** Answers this score was based on (added by the server). */
  scored_with?: Record<string, string>;
  /** Score before the latest re-score (added by the server). */
  prev_score?: number;
  /** Likely titles of the person who'd hire for this role (newer analyses). */
  hiring_titles?: string[];
};

export type ResumeResult = {
  resume_markdown: string;
  changes: { change: string; why: string }[];
  missing_numbers: string[];
  /** Candidate's check of each change (index → true/false). Added client-side. */
  verified?: Record<string, boolean>;
  /** Answers this resume was built with (added by the server). */
  used_answers?: Record<string, string>;
};

export type Outreach = { connection_note: string; message: string };
export type DetectedJob = { company: string | null; role: string | null; location: string | null; company_type: string | null };
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
    hiring_titles: arr(str),
    summary: str,
    top_skills: arr(obj({ skill: str, why: str, match: { type: "string", enum: ["strong", "partial", "missing"] }, evidence: nstr, gap_note: nstr, how_to_show: nstr })),
    ats_keywords: arr(str),
    keywords_missing: arr(str),
    real_problem: str,
    unwritten_expectations: arr(str),
    fit_score: { type: "integer" },
    fit_verdict: str,
    fit_reasoning: str,
    gaps: arr(obj({ gap: str, status: { type: "string", enum: ["lacking", "not_shown", "unsure"] }, explanation: str, how_to_close: str, question: nstr })),
    questions: arr(str),
  }),
  resume: obj({
    resume_markdown: str,
    changes: arr(obj({ change: str, why: str })),
    missing_numbers: arr(str),
  }),
  outreach: obj({ connection_note: str, message: str }),
  detect_job: obj({ company: nstr, role: nstr, location: nstr, company_type: nstr }),
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
  const confirmed = a.company && a.company !== "New job" ? `Company (confirmed by candidate): ${a.company}` : "";
  const role = a.role && a.role !== "Analysing..." ? `Role (confirmed by candidate): ${a.role}` : "";
  return ["=== JOB DESCRIPTION ===", confirmed, role, a.job_url && `Listing: ${a.job_url}`, a.jd].filter(Boolean).join("\n");
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
- full_name: the person's name as written, in normal capitalisation ("Priya Sharma", not "PRIYA SHARMA").
- current_title: the job title of the most recent role only, e.g. "Regional Head - North India". No company name.
- target_role: the most likely next role plus industry, e.g. "Digital Marketing Manager in e-commerce / D2C".
- experience_years: total years of full-time work from the dates, written only as "N years" or "N+ years" (e.g. "4 years", "5+ years"). Internships don't count. Null if there are no dates.
- city: the current city only, e.g. "Bengaluru" or "Delhi / NCR". No state, country or pincode.
- linkedin_url: only if a linkedin.com/in/ link is written in the resume; never guess one.
- strongest_proof: the 1-2 strongest results that have real numbers, copied faithfully, one line.
- skills: up to 12 skills or tools actually named in the resume.
Use null when the resume doesn't say. ${TRUTH_RULE}`,
        input: extra?.resume_text ?? "",
      };

    case "detect_job":
      return {
        instructions: `From this job description, pull out the company name, the job title, the location and the company type (startup / MNC / agency / D2C / marketplace...). Use the exact wording from the text. If something is not stated, return null - do not guess. ${CLEAN_RULE}`,
        input: extra?.jd ?? "",
      };

    case "analysis":
      return {
        instructions: `You are a senior recruiter at a top hiring firm in India, screening this candidate for a client. First decode the job description, then compare the candidate's resume against it, line by line. Be brutally honest, not flattering - but always specific and useful, so the candidate knows exactly what to do next.
Fill:
- company, role (from the JD; best guess if missing), company_type (startup / MNC / agency / D2C... or null), location, seniority, hiring_contact (the hiring manager or recruiter if the JD names one - e.g. "reports to Ananya Rao, Head of Growth" → "Ananya Rao, Head of Growth"; else null).
- hiring_titles: the 2-3 most likely job titles of the person who would hire for this role at this company (the hiring manager this role reports to, e.g. "Head of Category", "Regional Operations Director") - titles someone could search on LinkedIn. Do not include generic recruiter titles.
- summary: one short line on what this role is.
- top_skills: the 5 most important skills or experiences, ranked by how heavily the JD emphasises them. For each:
  - why: a few words on why it matters for this role.
  - match: "strong" = the resume clearly proves it; "partial" = related experience but not this exactly, or no proof/numbers; "missing" = nothing on the resume shows it.
  - evidence: the exact words from the resume that show it (a short quote, max ~20 words), or null if nothing does. Quote only - never paraphrase or invent.
  - gap_note: for partial/missing, one sentence on precisely what the resume doesn't show yet (e.g. "Shows vendor management, but not selecting or training partners"). null when strong.
  - how_to_show: for partial/missing, one concrete, truthful step - e.g. "If you trained partners at HooLiv, add how many and what changed", or "Lead with your vendor onboarding at X in your summary". Never suggest claiming something unproven. null when strong.
- ats_keywords: the 3 keywords most likely used to filter resumes for this role in an ATS.
- keywords_missing: which of those ats_keywords (exact same text) do NOT appear on the resume today. Empty if all appear.
- real_problem: one short paragraph - what problem is this company really trying to solve with this hire?
- unwritten_expectations: 3 things NOT written in the JD that this company almost certainly expects.
- fit_score: 0-10, honest. fit_verdict: a few words. fit_reasoning: 2-3 sentences a recruiter would tell the candidate directly.
- gaps: the top 3 gaps between what they want and what the resume shows. For each:
  - status: "lacking" = the candidate truly lacks it; "not_shown" = they very likely have it but the resume fails to show it; "unsure" = you can't tell without asking.
  - explanation: one or two sentences on why it's a gap for THIS role.
  - how_to_close: an honest plan. lacking → how to handle it truthfully (bridge with closest real experience, address it in the interview, or a quick way to build it). not_shown → exactly what to add to the resume and where. unsure → what answer would change your view.
  - question: for "unsure" (and "not_shown" when you need numbers), ONE specific question that settles it, under 25 words; else null.
- questions: every question from gaps (same exact text), plus any other you truly need. Keep each under 25 words.
If the candidate already answered questions below, use those answers as true facts: update the score, statuses and evidence accordingly, and don't ask those questions again.
If the company or role is marked "confirmed by candidate", use exactly that.
${CLEAN_RULE} ${TRUTH_RULE}`,
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
5. One page, simple formatting, no tables, no graphics, no photo - ATS-safe.
6. Simple, clear English.
resume_markdown: the full resume in Markdown, in EXACTLY this format (the candidate's own CV layout - nothing else):
# FULL NAME
Phone | Email | City
## SUMMARY
Two to three lines on who they are for THIS role, with their strongest real numbers.
## WORK EXPERIENCE
### Company Name || City, Country
Job Title || Mon YYYY - Mon YYYY
- Bullet: action verb + what they did + result, with the key numbers and names in **bold**
(repeat "Job Title || dates" + bullets for each role at the same company; a new ### line for each company)
## KEY SKILLS & TOOLS
- **Group name:** skill, skill, skill
## EDUCATION
### Institution, City || YYYY - YYYY
Degree, Subject; score
Class XII (Board), School, City - score || YYYY
Rules for the format: " || " separates the left and right side of a line - use it only on those lines. No italics anywhere. Section headings are always ## in capitals. Keep the candidate's own section order and education rows. No tables, no other symbols.
changes: every change you made and why, so the candidate can verify each is true.
missing_numbers: questions for numbers that would make bullets stronger (empty if none).`,
        input: [
          candidateBlock(profile),
          jobBlock(app!),
          answersBlock(app!),
          extra?.numbers && `=== NUMBERS THE CANDIDATE JUST GAVE ===\n${extra.numbers}`,
          extra?.untrue && `=== CHANGES THE CANDIDATE SAYS ARE NOT TRUE - undo or correct each one; never repeat these claims ===\n${extra.untrue}`,
          extra?.fit_one_page &&
            `=== MUST FIT ONE PAGE ===\n${extra.fit_one_page}\nShorten it: keep at most 3-4 bullets for older or less relevant roles, merge overlapping bullets, cut filler words and generic summary lines, keep the summary to 2 lines. Keep every number, keyword and fact that matters for THIS job. Never add anything. List what you cut in changes.`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      };
    }

    case "outreach":
      return {
        instructions: `Write LinkedIn outreach to the person hiring for this role${extra?.contact ? ` (${extra.contact})` : " (hiring manager or recruiter)"}. Goal: show the candidate understands THEIR business and can solve a real problem - not just list history.
connection_note: under 250 characters, two short lines: one warm, specific, concrete line about their company or work; one friendly line saying they'd love to connect and follow what they're building. Do NOT pitch or mention the job.
message: under 110 words, for after they accept or as a cold InMail:
- one short warm opening line of genuine interest in the role;
- one line naming a REAL, specific challenge this company likely faces, drawn only from the JD and their business;
- one or two lines connecting the candidate's single strongest real result to exactly that challenge;
- a confident close (e.g. would love to be considered / walk them through how they'd approach it). NO hedging like "if relevant".
NO abstract theory, NO lecturing, NO buzzwords, NO flattery, NO hedging. ${TRUTH_RULE}`,
        input: [
          candidateBlock(profile),
          jobBlock(app!),
          (app!.analysis as Analysis | null)?.real_problem &&
            `=== RECRUITER'S READ OF THEIR REAL PROBLEM (use as the challenge, in your own words) ===\n${(app!.analysis as Analysis).real_problem}`,
          answersBlock(app!),
        ]
          .filter(Boolean)
          .join("\n\n"),
      };

    case "linkedin":
      return {
        instructions: `Rewrite the candidate's LinkedIn for the target role: ${extra?.role || profile.target_role || "their next role"}.
headlines: 3 options, each under 220 characters, leading with the exact terms a recruiter would type to find someone for this role. No buzzwords like "passionate", "dynamic", "results-driven".
about: under 150 words, first person. The first 2 lines must work as a hook on their own (LinkedIn hides the rest). End with what they're looking for. Use line breaks between short paragraphs.
skills: the top 5 skills to add and pin - what recruiters in this field actually search and filter by - only if true from the resume.
${TRUTH_RULE}`,
        input: candidateBlock(profile),
      };
  }
}

// ───────────────────────── Practice insights (from a session) ─────────────────────────
export type InterviewReport = {
  score: number;
  verdict: string;
  strongest: { moment: string; why: string }[];
  weakest: { question: string; why_weak: string; better_answer: string }[];
  next_focus: string;
};
export type OfferCheck = {
  position: "below" | "at" | "above";
  reasoning: string;
  counter_low: string;
  counter_high: string;
  opening_line: string;
  objections: { hr_says: string; you_say: string }[];
};

export const INSIGHT_SCHEMAS = {
  interview_report: obj({
    score: { type: "integer" },
    verdict: str,
    strongest: arr(obj({ moment: str, why: str })),
    weakest: arr(obj({ question: str, why_weak: str, better_answer: str })),
    next_focus: str,
  }),
  offer_check: obj({
    position: { type: "string", enum: ["below", "at", "above"] },
    reasoning: str,
    counter_low: str,
    counter_high: str,
    opening_line: str,
    objections: arr(obj({ hr_says: str, you_say: str })),
  }),
};

export function buildInsight(
  kind: keyof typeof INSIGHT_SCHEMAS,
  ctx: { profile: Profile; app?: Application | null; transcript?: string; offer?: Record<string, string> },
): { instructions: string; input: string } {
  if (kind === "interview_report")
    return {
      instructions: `You were the hiring manager in the mock interview below. The interview is over. Give the candidate honest feedback, in simple English, like a senior interviewer who wants them to get the job:
- score: 0-10 for the interview as a whole. Be honest, not flattering.
- verdict: one short line (e.g. "Strong on results, vague on how").
- strongest: their 2-3 strongest moments - quote or closely paraphrase what they actually said, and why it worked.
- weakest: their weakest answers (2-3). For each: the question, the exact reason it was weak, and what a 9/10 answer would have sounded like - written in the candidate's voice, using ONLY facts from their resume and answers (never invent numbers; say "[your number]" where a number is needed).
- next_focus: the one thing to practise before the real interview.
If the interview is very short, base it on what's there and say so in the verdict. ${TRUTH_RULE}`,
      input: [candidateBlock(ctx.profile), ctx.app?.jd ? jobBlock(ctx.app) : "", "=== INTERVIEW TRANSCRIPT ===", ctx.transcript ?? ""].filter(Boolean).join("\n\n"),
    };
  const o = ctx.offer ?? {};
  return {
    instructions: `You are a salary negotiation coach in India. The candidate has an offer. In simple English:
- position: is the offer below, at, or above the market range they found? Reason it out in reasoning (2-3 sentences), using their market data, current CTC, experience and strongest proof. Treat your own salary knowledge as a rough guide only.
- counter_low / counter_high: a realistic counter range (e.g. "₹10.5 LPA") - not a fantasy number.
- opening_line: the exact first thing they should say to HR when countering - warm, confident, one or two sentences, using their strongest proof.
- objections: the 3 pushbacks HR is most likely to give, each with a short, confident reply (hr_says / you_say).
${TRUTH_RULE}`,
    input: [
      candidateBlock(ctx.profile),
      "=== THE OFFER ===",
      `Role: ${o.role ?? ""}. Company type: ${o.company_type ?? ""}. City: ${o.city ?? ""}.`,
      `Offered CTC: ${o.offered_ctc ?? ""}. Current CTC: ${o.current_ctc ?? ""}. Experience: ${o.experience ?? ""}.`,
      `Market range they found (AmbitionBox/Glassdoor): ${o.market_range ?? ""}.`,
      `Strongest proof: ${o.strongest_proof ?? ""}.`,
    ].join("\n"),
  };
}
