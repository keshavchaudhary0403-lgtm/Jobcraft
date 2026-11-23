/**
 * Demo mode (AI_DEMO=1): every AI call returns realistic sample data instantly.
 * No OpenAI requests, no cost. Used for UI smoke tests.
 */
export const DEMO = process.env.AI_DEMO === "1";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const FIXTURES: Record<string, unknown> = {
  parse_resume: {
    resume_text:
      "ASHA NAIR\nBengaluru · asha.nair@example.com\n\nEXPERIENCE\nOperations Manager, QuickNest (home services) — 2021 – Present\n- Ran partner operations across 4 cities with 320 service partners\n- Cut partner churn from 18% to 9% in two quarters\n- Led a team of 14 city executives\n\nOperations Associate, Freshkart — 2018 – 2021\n- Managed last-mile vendors for 2 zones\n\nEDUCATION\nMBA, Christ University, 2018\n\nSKILLS\nPartner management, SQL, Excel, Process design",
    full_name: "Asha Nair",
    current_title: "Operations Manager",
    target_role: "Senior Operations Manager in consumer services",
    experience_years: "about 7 years",
    city: "Bengaluru",
    strongest_proof: "Cut partner churn from 18% to 9% in two quarters across 320 service partners.",
    skills: ["Partner management", "Multi-city operations", "SQL", "Excel", "Process design", "Team leadership"],
    linkedin_url: null,
  },
  detect_job: { company: "Urban Company", role: "Senior Category Manager", location: "Gurugram", company_type: "Consumer services marketplace" },
  analysis: {
    company: "Urban Company",
    role: "Senior Category Manager",
    company_type: "Consumer services marketplace",
    location: "Gurugram",
    seniority: "Senior",
    hiring_contact: null,
    summary: "Own partner quality and operational excellence for a set of cities.",
    top_skills: [
      { skill: "Multi-city operations", why: "Main focus of the role", match: "strong" },
      { skill: "Partner selection and training", why: "Called the crux of the role", match: "partial" },
      { skill: "Team and project leadership", why: "Lead people and projects", match: "strong" },
      { skill: "Service quality improvement", why: "Central growth track", match: "partial" },
      { skill: "Cross-functional execution", why: "Works across teams", match: "strong" },
    ],
    ats_keywords: ["Operations Management", "Partner Management", "Operational Excellence"],
    real_problem:
      "They need someone who can raise service quality city by city — choosing better partners, training them, and holding the bar — while still growing the category.",
    unwritten_expectations: [
      "Comfort with daily metrics reviews and fast decisions",
      "Willingness to be on the ground in partner hubs",
      "Clear written updates for leadership",
    ],
    fit_score: 7,
    fit_verdict: "Strong operations fit; quality evidence is thin",
    fit_reasoning:
      "Multi-city ownership and team leadership match well. The resume shows partner churn results but not how partners were selected and trained, which is the core of this role.",
    gaps: [
      { gap: "Partner selection and training", status: "not_shown", explanation: "You likely did this, but the resume doesn't say how." },
      { gap: "Service quality metrics", status: "unsure", explanation: "No ratings, complaints or quality scores are mentioned." },
      { gap: "Category growth projects", status: "lacking", explanation: "No product or offering launches appear on the resume." },
    ],
    questions: ["Did you set up how new partners were selected or trained? How many?", "Did you track ratings or complaints? What changed?"],
  },
  resume: {
    resume_markdown:
      "# Asha Nair\nBengaluru · asha.nair@example.com\n\n## Experience\n### Operations Manager — QuickNest\n*2021 – Present*\n- Ran partner operations across 4 cities with 320 service partners.\n- Cut partner churn from 18% to 9% in two quarters by redesigning onboarding.\n- Led a team of 14 city executives with weekly quality reviews.\n\n### Operations Associate — Freshkart\n*2018 – 2021*\n- Managed last-mile vendors across 2 zones.\n\n## Education\nMBA, Christ University — 2018\n\n## Skills\nPartner Management · Operations Management · SQL · Excel · Process Design",
    changes: [
      { change: "Moved partner operations to the top", why: "It's the main focus of the role" },
      { change: "Added 'Operations Management' and 'Partner Management'", why: "ATS keywords that are true for you" },
    ],
    missing_numbers: ["How many partners did you onboard or train per month?", "By how much did ratings or complaints change?"],
  },
  outreach: {
    connection_note: "Loved reading how Urban Company is raising partner quality city by city.\nWould be great to connect and follow what you're building.",
    message:
      "Hi — I'm very interested in the Senior Category Manager role.\n\nRaising partner quality while growing supply across cities is hard to do at the same time.\n\nAt QuickNest I cut partner churn from 18% to 9% in two quarters across 320 partners by redesigning onboarding.\n\nI'd love to be considered and walk you through how I'd approach it.",
  },
  linkedin: {
    headlines: [
      "Senior Operations Manager | Multi-city Partner Operations | Service Quality | Consumer Services",
      "Operations & Partner Management | 320+ service partners across 4 cities | Churn 18% → 9%",
      "Consumer Services Operations Leader | Partner Onboarding, Quality & Team Leadership",
    ],
    about:
      "I fix service quality at scale.\nAt QuickNest I run partner operations across 4 cities and cut partner churn from 18% to 9% in two quarters.\n\nMy work sits where operations meets people: choosing the right partners, training them, and building simple reviews that keep quality high.\n\nI'm looking for a senior operations or category role in consumer services.",
    skills: ["Operations Management", "Partner Management", "Process Improvement", "Team Leadership", "SQL"],
  },
};

export async function demoStructured<T>(name: string): Promise<T> {
  await sleep(name === "detect_job" ? 500 : 1800);
  return structuredClone(FIXTURES[name]) as T;
}

const CHAT: Record<string, string[]> = {
  interview: [
    "Thanks for coming in. Let's start simple — tell me about the operations work you're proudest of, and what your part in it was.",
    "Good. You mentioned partner quality — how exactly did you decide which partners to keep and which to let go?",
    "Walk me through a week where a city's numbers suddenly dropped. What did you do first?",
  ],
  negotiation: [
    "**Market check:** at ₹9 LPA this offer sits at the lower end of the ₹8–12 LPA range you found. With your churn result, a realistic counter is **₹10.5–11 LPA**.\n\nNow I'm HR. Thanks for your time — we're excited to have you. The offer is ₹9 LPA. What are your thoughts?",
    "I understand. But ₹9 LPA is already above what we pay most people at this level. Can you help me understand why you're asking for more?",
  ],
  workspace: ["Good question. Based on the job and your resume, I'd lead with your churn result — it's the clearest proof you can raise partner quality."],
};

export async function* demoChat(kind: string, turn: number) {
  const lines = CHAT[kind] ?? CHAT.workspace;
  const text = `${lines[Math.min(turn, lines.length - 1)]}\n\n_(Demo mode — sample reply, no AI used.)_`;
  await sleep(400);
  for (const word of text.split(/(?<= )/)) {
    await sleep(18);
    yield word;
  }
}
