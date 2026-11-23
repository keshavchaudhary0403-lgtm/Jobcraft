/**
 * Demo mode (AI_DEMO=1): every AI call returns realistic sample data instantly.
 * No OpenAI requests, no cost. Used for UI smoke tests.
 */
export const DEMO = process.env.AI_DEMO === "1";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const FIXTURES: Record<string, unknown> = {
  parse_resume: {
    resume_text:
      "ASHA NAIR\nBengaluru · asha.nair@example.com\n\nEXPERIENCE\nOperations Manager, QuickNest (home services) - 2021 - Present\n- Ran partner operations across 4 cities with 320 service partners\n- Cut partner churn from 18% to 9% in two quarters\n- Led a team of 14 city executives\n\nOperations Associate, Freshkart - 2018 - 2021\n- Managed last-mile vendors for 2 zones\n\nEDUCATION\nMBA, Christ University, 2018\n\nSKILLS\nPartner management, SQL, Excel, Process design",
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
    hiring_titles: ["Head of Category", "Director - Category Management", "City Business Head"],
    summary: "Own partner quality and operational excellence for a set of cities.",
    top_skills: [
      { skill: "Multi-city operations", why: "Main focus of the role", match: "strong", evidence: "Ran partner operations across 4 cities with 320 service partners", gap_note: null, how_to_show: null },
      { skill: "Partner selection and training", why: "Called the crux of the role", match: "partial", evidence: "Cut partner churn from 18% to 9% in two quarters", gap_note: "Shows you kept partners, but not how you chose or trained them.", how_to_show: "If you set up partner onboarding or training at QuickNest, add how many partners and what improved." },
      { skill: "Team and project leadership", why: "Lead people and projects", match: "strong", evidence: "Led a team of 14 city executives", gap_note: null, how_to_show: null },
      { skill: "Service quality improvement", why: "Central growth track", match: "partial", evidence: null, gap_note: "No ratings, complaints or quality scores on the resume.", how_to_show: "Add one quality number you moved - ratings, complaint rate or repeat rate - if you tracked it." },
      { skill: "Cross-functional execution", why: "Works across teams", match: "strong", evidence: "Led a team of 14 city executives with weekly quality reviews", gap_note: null, how_to_show: null },
    ],
    ats_keywords: ["Operations Management", "Partner Management", "Operational Excellence"],
    keywords_missing: ["Operational Excellence"],
    real_problem:
      "They need someone who can raise service quality city by city - choosing better partners, training them, and holding the bar - while still growing the category.",
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
      { gap: "Partner selection and training", status: "not_shown", explanation: "You likely did this, but the resume doesn't say how.", how_to_close: "Add a bullet under QuickNest on how you selected and trained partners - with the number trained and the result.", question: "Did you set up how new partners were selected or trained? How many?" },
      { gap: "Service quality metrics", status: "unsure", explanation: "No ratings, complaints or quality scores are mentioned.", how_to_close: "If you tracked ratings or complaints, one real before/after number would close this gap.", question: "Did you track ratings or complaints? What changed?" },
      { gap: "Category growth projects", status: "lacking", explanation: "No product or offering launches appear on the resume.", how_to_close: "Don't claim it. In the interview, bridge with your city expansion work and show how you'd approach a launch.", question: null },
    ],
    questions: ["Did you set up how new partners were selected or trained? How many?", "Did you track ratings or complaints? What changed?"],
  },
  resume: {
    resume_markdown:
      "# Asha Nair\nBengaluru · asha.nair@example.com\n\n## Experience\n### Operations Manager - QuickNest\n*2021 - Present*\n- Ran partner operations across 4 cities with 320 service partners.\n- Cut partner churn from 18% to 9% in two quarters by redesigning onboarding.\n- Led a team of 14 city executives with weekly quality reviews.\n\n### Operations Associate - Freshkart\n*2018 - 2021*\n- Managed last-mile vendors across 2 zones.\n\n## Education\nMBA, Christ University - 2018\n\n## Skills\nPartner Management · Operations Management · SQL · Excel · Process Design",
    changes: [
      { change: "Moved partner operations to the top", why: "It's the main focus of the role" },
      { change: "Added 'Operations Management' and 'Partner Management'", why: "ATS keywords that are true for you" },
    ],
    missing_numbers: ["How many partners did you onboard or train per month?", "By how much did ratings or complaints change?"],
  },
  outreach: {
    connection_note: "Loved reading how Urban Company is raising partner quality city by city.\nWould be great to connect and follow what you're building.",
    message:
      "Hi - I'm very interested in the Senior Category Manager role.\n\nRaising partner quality while growing supply across cities is hard to do at the same time.\n\nAt QuickNest I cut partner churn from 18% to 9% in two quarters across 320 partners by redesigning onboarding.\n\nI'd love to be considered and walk you through how I'd approach it.",
  },
  interview_report: {
    score: 7,
    verdict: "Strong on results, vague on how you did them",
    strongest: [
      { moment: "\"We cut partner churn from 18% to 9% in two quarters.\"", why: "A real number, said early and with confidence." },
      { moment: "Your answer on handling a city where numbers dropped", why: "You walked through first steps in order - data, partners, then people." },
    ],
    weakest: [
      { question: "How did you decide which partners to keep?", why_weak: "You said 'we looked at quality' but never said what you measured.", better_answer: "I tracked three things weekly - ratings, cancellations and repeat bookings. Partners below the bar got a two-week coaching plan; if nothing changed, we replaced them. That's how churn went from 18% to 9%." },
      { question: "Why should we hire you?", why_weak: "It listed your history instead of linking it to their problem.", better_answer: "You need someone who can raise partner quality while growing supply. I've done exactly that across 4 cities with 320 partners - and I'd start by fixing how partners are chosen and trained here." },
    ],
    next_focus: "For every result, say how you did it in one sentence before the number.",
  },
  offer_check: {
    position: "below",
    reasoning: "₹9 LPA sits at the low end of the ₹8-12 LPA range you found. With about 7 years and a clear churn result, you can reasonably ask for the upper half of that range.",
    counter_low: "₹10.5 LPA",
    counter_high: "₹11 LPA",
    opening_line: "Thank you - I'm really excited about this role. Given that I cut partner churn from 18% to 9% across 320 partners, I was expecting something closer to ₹11 LPA. Is there flexibility there?",
    objections: [
      { hr_says: "This is already above what we pay most people at this level.", you_say: "I understand. I'm not asking for the average - I'm bringing a proven result on the exact problem this role exists to solve." },
      { hr_says: "Our budget for this role is fixed.", you_say: "That makes sense. Could we look at a joining bonus or a review at six months tied to clear goals?" },
      { hr_says: "Can you share your current CTC?", you_say: "It's ₹8 LPA, but I'm basing my ask on the market range for this role and the results I've delivered." },
    ],
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
    "Thanks for coming in. Let's start simple - tell me about the operations work you're proudest of, and what your part in it was.",
    "Good. You mentioned partner quality - how exactly did you decide which partners to keep and which to let go?",
    "Walk me through a week where a city's numbers suddenly dropped. What did you do first?",
  ],
  negotiation: [
    "**Market check:** at ₹9 LPA this offer sits at the lower end of the ₹8-12 LPA range you found. With your churn result, a realistic counter is **₹10.5-11 LPA**.\n\nNow I'm HR. Thanks for your time - we're excited to have you. The offer is ₹9 LPA. What are your thoughts?",
    "I understand. But ₹9 LPA is already above what we pay most people at this level. Can you help me understand why you're asking for more?",
  ],
  workspace: ["Good question. Based on the job and your resume, I'd lead with your churn result - it's the clearest proof you can raise partner quality."],
};

export async function* demoChat(kind: string, turn: number) {
  const lines = CHAT[kind] ?? CHAT.workspace;
  const text = `${lines[Math.min(turn, lines.length - 1)]}\n\n_(Demo mode - sample reply, no AI used.)_`;
  await sleep(400);
  for (const word of text.split(/(?<= )/)) {
    await sleep(18);
    yield word;
  }
}
