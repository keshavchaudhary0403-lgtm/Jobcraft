/**
 * The Prompt Library ("Get Hired Faster: The AI Job Search System").
 *
 * Each prompt is filled automatically from the user's saved Profile and the
 * Application (job). The resume + job description travel in the system prompt
 * as a "candidate file", so every prompt works even if the user jumps steps -
 * the same effect as "keep one chat open" in the original workflow.
 */
import type { Application, Profile } from "./types";

export type StepKey =
  | "jd_decoder"
  | "fit_score"
  | "resume_tailor"
  | "linkedin"
  | "outreach"
  | "mock_interview"
  | "negotiation";

export type NegotiationInputs = {
  role: string;
  company_type: string;
  city: string;
  offered_ctc: string;
  current_ctc: string;
  experience: string;
  market_range: string;
  strongest_proof: string;
};

export const STEP_META: Record<StepKey, { n: number; title: string; short: string; when: string }> = {
  jd_decoder: {
    n: 1,
    title: "The JD Decoder",
    short: "Decode JD",
    when: "Understand what the job really wants before you apply.",
  },
  fit_score: {
    n: 2,
    title: "The Honest Fit Score",
    short: "Fit score",
    when: "See how well you match before applying. Answer its questions in the chat below.",
  },
  resume_tailor: {
    n: 3,
    title: "The Resume Tailor",
    short: "Tailor resume",
    when: "Rewrite your resume for this job - honestly. It will ask for numbers instead of inventing them.",
  },
  linkedin: {
    n: 4,
    title: "The LinkedIn Rewrite",
    short: "LinkedIn",
    when: "Make your LinkedIn profile show up in recruiter searches.",
  },
  outreach: {
    n: 5,
    title: "The Value-Led Outreach",
    short: "Outreach",
    when: "After you've found the hiring person - your connection note and message.",
  },
  mock_interview: {
    n: 6,
    title: "Mock Interview",
    short: "Mock interview",
    when: "Before any real interview. Run it 3 times, a fresh session each time, until nothing surprises you.",
  },
  negotiation: {
    n: 7,
    title: "Negotiation Coach",
    short: "Negotiation",
    when: "Once you have an offer. Practise the salary talk out loud before the real conversation.",
  },
};

export const WORKSPACE_STEPS: StepKey[] = ["jd_decoder", "fit_score", "resume_tailor", "linkedin", "outreach"];

const or = (v: string | null | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);

export function buildPrompt(
  step: StepKey,
  ctx: { profile: Profile; app?: Application | null; negotiation?: NegotiationInputs },
): string {
  const { profile, app } = ctx;
  const targetRole = or(profile.target_role, app ? `${app.role}` : "[your target role and industry]");

  switch (step) {
    case "jd_decoder":
      return `You are an experienced recruiter hiring in India. Here is a job description. Analyse it and give me:

1. The 5 most important skills or experiences for this role, ranked by how heavily the JD emphasises them.
2. The 3 keywords most likely used to filter resumes for this role in an ATS.
3. In one short paragraph, what problem is this company really trying to solve with this hire?
4. Three things NOT written in the JD that this company almost certainly expects from this role.

Job description: the full JD for ${app?.role ?? "the role"} at ${app?.company ?? "the company"} is in the candidate file above.`;

    case "fit_score":
      return `Here is my current resume (in the candidate file above). Compare it against the job description above and give me, in simple English:

1. A fit score out of 10, with your honest reasoning.
2. The top 3 gaps between what they want and what my resume shows.
3. For each gap, tell me clearly: do I actually lack this, or do I have it but my resume fails to show it? Where you are not sure, ask me specific questions to find out before finalising your answer.

Be brutally honest, not flattering.`;

    case "resume_tailor":
      return `Rewrite my resume for this specific job description. Follow these rules:

1. Do not invent any skill, tool, number, employer, date, or project. Only reframe what is already true.
2. Reorder and rewrite my bullet points so the most relevant experience for THIS role comes first.
3. Naturally include the keywords you identified earlier, only where they are genuinely true for me.
4. Write every bullet as: action verb + what I did + measurable result. If I have not given a number, ask me for it instead of inventing it.
5. Keep it to one page, simple formatting, no tables, no graphics, no photo, so it stays ATS-safe.
6. Use simple, clear English.

Put the full resume between the lines ===RESUME START=== and ===RESUME END=== so I can save it.

After the resume, list every change you made and why, so I can verify each one is true.`;

    case "linkedin":
      return `Here is my resume, already in this chat. My target role is ${targetRole}. In simple English:

1. Write 3 headline options, each under 220 characters, that lead with the exact terms a recruiter would type to find someone for this role. No buzzwords like "passionate", "dynamic", or "results-driven".
2. Write my About section, under 150 words, first person. The first 2 lines must work as a hook on their own, because LinkedIn hides the rest until someone clicks. End with what I'm looking for.
3. List the top 5 skills I should add and pin, the ones recruiters in this field actually search and filter by. Use only what is true from my resume.`;

    case "outreach":
      return `You have my resume and the job description in this chat. I want to reach the person hiring for this role on LinkedIn${
        app?.hiring_contact ? ` (${app.hiring_contact})` : ""
      }, this might be the hiring manager or a recruiter. The goal is to show that I understand THEIR business and can help solve a real problem they have, not just list what I've done.
Give me two things, clearly labelled:

1. CONNECTION REQUEST NOTE (under 250 characters), two short lines: one warm, specific, concrete line about their company or work; one friendly line saying I'd love to connect and follow what they're building. Do NOT pitch myself or mention the job here.
2. OUTREACH MESSAGE (under 110 words). I'll use this either as a follow-up after they accept my request, or as a direct message / InMail if I'm reaching them cold. Structure it as:
   - One short, warm opening line of genuine interest in the role.
   - One line naming a REAL, specific challenge this company likely faces, drawn from their actual situation in the job description. Base it only on what the JD and their business actually show. Do NOT invent generic theory or lecture them.
   - One or two lines connecting my single strongest real result to solving exactly that challenge.
   - A confident close, for example that I'd love to be considered or to walk them through how I'd approach it. NO hedging like "if relevant" or "if useful".

Rules: simple, clear English. Connect every claim to THEIR need, not just my history. NO abstract theory, NO lecturing, NO buzzwords, NO flattery, NO hedging. Only facts that are true from my resume.`;

    case "mock_interview":
      return `We are going to do a full mock interview, by voice. You are the hiring manager at ${or(
        app?.company,
        "[company name]",
      )}, interviewing me for the ${or(app?.role, "[role]")} role. The job description and my resume are already in this chat. Follow these rules:

1. Ask me one question at a time, and wait for my full answer before the next.
2. When my answer is vague or has no specifics, ask a follow-up, exactly like a real interviewer would.
3. Mix the questions: some about my experience, some role-specific situations, and at least one "why should we hire you".
4. Do not give me any feedback during the interview. Stay fully in character.
5. After 6 questions, end the interview. Then give me, in simple English: a score out of 10, my strongest moments, my weakest answers with the exact reason why each was weak, and what a 9 out of 10 answer would have sounded like for each of the weakest answers.

Begin when I say "ready".`;

    case "negotiation": {
      const n = ctx.negotiation!;
      return `I have a job offer and I want to practise negotiating it, by voice. My details:

Role: ${n.role}. Company type: ${n.company_type}. City: ${n.city}.

Offered CTC: ${n.offered_ctc}. My current CTC: ${n.current_ctc}. Experience: ${n.experience}.

Real market data I found on AmbitionBox or Glassdoor: ${n.market_range}.

My strongest proof: ${n.strongest_proof}.

Do this:

1. First, in simple English, tell me: is this offer below, at, or above market? Reason it out, and suggest a realistic counter range, not a fantasy number.
2. Then become the HR manager. I will make my counter by voice. Push back on me the way real HR would, one objection at a time, and let me respond, back and forth, like a real negotiation.
3. Stay in character as HR until I say "stop". Then give me quick feedback on how I did and one thing to improve.

Important: I will verify the market number myself. Treat your own salary knowledge as a rough starting point, not the truth.`;
    }
  }
}

/** The "candidate file" - stable context sent as the system prompt for every session. */
export function buildSystemPrompt(opts: {
  profile: Profile;
  app?: Application | null;
  kind: "workspace" | "linkedin" | "interview" | "negotiation";
}): string {
  const { profile, app, kind } = opts;
  const lines: string[] = [
    "You are Jobcraft, a warm, direct job-search coach for a candidate in India. Keep replies short and practical.",
    "",
    "Ground rules that apply to everything you write:",
    "- Only what's true. Never add a skill, number, employer, date, project or claim the candidate can't back up in a real interview. Reframe what's true; never invent. If you need a fact or number you don't have, ask for it.",
    "- Simple, clear English. No buzzwords.",
    "- Follow the candidate's prompt exactly, including any structure, labels, length limits and character limits it asks for.",
  ];
  if (kind === "interview" || kind === "negotiation") {
    lines.push(
      "- This is a spoken role-play. While in character, reply the way a person talks: short, natural sentences, one question or point at a time, no markdown, no bullet lists, no headings. Use normal formatting only for the final feedback.",
    );
  }
  lines.push("", "=== CANDIDATE FILE ===");
  lines.push(`Name: ${or(profile.full_name, "(not given)")}`);
  if (profile.target_role) lines.push(`Target role: ${profile.target_role}`);
  if (profile.experience_years) lines.push(`Experience: ${profile.experience_years}`);
  if (profile.city) lines.push(`City: ${profile.city}`);
  if (profile.current_ctc) lines.push(`Current CTC: ${profile.current_ctc}`);
  if (profile.strongest_proof) lines.push(`Strongest proof (real results): ${profile.strongest_proof}`);
  if (profile.extra_notes) lines.push(`Other true facts about me: ${profile.extra_notes}`);
  lines.push("", "--- MY RESUME ---", or(profile.master_resume, "(The candidate has not added a resume yet. Ask them to paste it.)"));
  if (app) {
    lines.push(
      "",
      "--- THE JOB ---",
      `Company: ${app.company}`,
      `Role: ${app.role}`,
      app.company_type ? `Company type: ${app.company_type}` : "",
      app.job_url ? `Job link: ${app.job_url}` : "",
      app.hiring_contact ? `Hiring contact: ${app.hiring_contact}` : "",
      "",
      "--- JOB DESCRIPTION ---",
      app.jd,
    );
    const an = app.analysis as {
      real_problem?: string;
      fit_score?: number;
      gaps?: { gap: string; status: string; explanation: string }[];
    } | null;
    if (an?.real_problem) {
      lines.push(
        "",
        "--- RECRUITER NOTES (from the screening - use them; in an interview, probe the gaps with real follow-ups) ---",
        `Real problem this hire solves: ${an.real_problem}`,
        ...(an.gaps ?? []).map((g) => `Gap (${g.status.replace("_", " ")}): ${g.gap} - ${g.explanation}`),
      );
    }
    const answers = Object.entries(app.fit_answers ?? {}).filter(([, v]) => v?.trim());
    if (answers.length) {
      lines.push("", "--- MY ANSWERS TO THE RECRUITER'S QUESTIONS (true facts) ---", ...answers.map(([q, v]) => `Q: ${q}\nA: ${v}`));
    }
  }
  lines.push("=== END CANDIDATE FILE ===");
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

/** Pull the tailored resume out of a Resume Tailor reply, if it used the markers. */
export function extractResume(text: string): string | null {
  const m = text.match(/===\s*RESUME START\s*===([\s\S]*?)===\s*RESUME END\s*===/i);
  return m ? m[1].trim() : null;
}
