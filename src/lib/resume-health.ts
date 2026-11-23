// No imports — runs instantly in the browser, no AI cost.

/**
 * Resume health, following the PDF's Prompt 3 rules:
 * every bullet = action verb + what you did + a measurable result; simple, ATS-safe; no buzzwords.
 */

export type BulletCheck = { key: "number" | "verb" | "length" | "active" | "filler" | "buzzword"; ok: boolean; label: string };
export type BulletReport = { line: number; text: string; score: number; checks: BulletCheck[]; tip: string | null };
export type DocCheck = { label: string; ok: boolean; tip: string };
export type HealthReport = { score: number; bullets: BulletReport[]; doc: DocCheck[]; words: number; grade: "strong" | "good" | "fair" | "weak" };

const WEAK_STARTS = /^(responsible for|in charge of|worked on|working on|helped|assisted|involved in|participated in|handled|duties included|tasked with|part of)\b/i;
const STRONG_VERB =
  /^(led|lead|built|launched|scaled|grew|cut|reduced|increased|improved|drove|delivered|managed|ran|owned|created|designed|developed|set up|setup|secured|closed|negotiated|achieved|turned|procured|launched|opened|hired|trained|recruited|coached|mentored|automated|streamlined|optimi[sz]ed|analy[sz]ed|implemented|introduced|established|expanded|generated|saved|won|signed|onboarded|organi[sz]ed|planned|produced|resolved|restructured|revamped|spearheaded|transformed|boosted|raised|halved|doubled|tripled|shipped|wrote|presented|partnered|collaborated|coordinated|supervised|directed|oversaw|headed|assumed|took over|handled)\b/i;
const FILLER = /\b(various|several|etc\.?|successfully|effectively|efficiently|in order to|a number of|responsible for|day[- ]to[- ]day|multiple tasks)\b/i;
const BUZZ = /\b(passionate|dynamic|results[- ]driven|go[- ]getter|synergy|synergies|team player|hard[- ]?working|self[- ]motivated|detail[- ]oriented|out of the box|thought leader|rockstar|ninja|guru|proactive|strategic thinker|value add)\b/i;
const NUMBER = /(\d|₹|\$|%|\b(one|two|three|four|five|six|seven|eight|nine|ten|twice|double|half|dozen|hundred|thousand|lakh|crore)\b)/i;
const PASSIVE = /\b(was|were|been|being)\s+\w+(ed|en)\b/i;

const TIPS: Record<BulletCheck["key"], string> = {
  number: "Add a real number — how many, how much, how fast, or by what %.",
  verb: "Start with a strong action verb (Led, Built, Cut, Grew…).",
  length: "Keep it to one or two lines — about 10 to 35 words.",
  active: "Say what you did, not what was done ('Cut costs', not 'Costs were cut').",
  filler: "Remove filler words like 'various', 'successfully', 'responsible for'.",
  buzzword: "Drop buzzwords — show it with a result instead.",
};

export function checkBullet(text: string, line: number): BulletReport {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  const checks: BulletCheck[] = [
    { key: "number", ok: NUMBER.test(t), label: "Has a number" },
    { key: "verb", ok: STRONG_VERB.test(t) && !WEAK_STARTS.test(t), label: "Strong verb" },
    { key: "length", ok: words >= 8 && words <= 38, label: "Good length" },
    { key: "active", ok: !PASSIVE.test(t) && !WEAK_STARTS.test(t), label: "Active voice" },
    { key: "filler", ok: !FILLER.test(t), label: "No filler" },
    { key: "buzzword", ok: !BUZZ.test(t), label: "No buzzwords" },
  ];
  const weights = { number: 3, verb: 2, length: 1.5, active: 1.5, filler: 1, buzzword: 1 } as const;
  const score = Math.round(checks.reduce((s, c) => s + (c.ok ? weights[c.key] : 0), 0));
  const firstFail = checks.find((c) => !c.ok);
  return { line, text: t, score, checks, tip: firstFail ? TIPS[firstFail.key] : null };
}

export function resumeHealth(resume: string): HealthReport {
  const lines = resume.split("\n");
  const bullets: BulletReport[] = [];
  lines.forEach((raw, i) => {
    const m = raw.match(/^\s*[-•*]\s+(.*)$/);
    if (m && m[1].trim().split(/\s+/).length >= 3) bullets.push(checkBullet(m[1], i));
  });
  const text = resume.toLowerCase();
  const words = resume.split(/\s+/).filter(Boolean).length;
  const has = (re: RegExp) => re.test(resume);
  const doc: DocCheck[] = [
    { label: "Email and phone at the top", ok: has(/[\w.+-]+@[\w-]+\.\w+/) && has(/(\+?\d[\d\s-]{8,})/), tip: "Put your email and phone in the first lines so recruiters (and ATS) can find them." },
    { label: "Clear sections", ok: /experience/.test(text) && /education/.test(text) && /skill/.test(text), tip: "Use plain headings: Summary, Experience, Education, Skills." },
    { label: "Short summary at the top", ok: /summary|profile|objective/.test(text), tip: "Add a 2–3 line summary that says who you are and your best result." },
    { label: "Right length (1–2 pages)", ok: words >= 250 && words <= 900, tip: words < 250 ? "Too short — add your key results for each role." : "Too long — cut older or less relevant bullets." },
    { label: "Plain text, no tables or columns", ok: !/\t|│|┃|║/.test(resume), tip: "Avoid tables and multi-column layouts — ATS reads them out of order." },
    { label: "Bullets for each role", ok: bullets.length >= 4, tip: "Write your experience as bullets — one achievement per line." },
  ];
  const bulletAvg = bullets.length ? bullets.reduce((s, b) => s + b.score, 0) / bullets.length : 0;
  const docScore = doc.filter((d) => d.ok).length / doc.length;
  const score = Math.round(bulletAvg * 7 + docScore * 30);
  const grade = score >= 85 ? "strong" : score >= 70 ? "good" : score >= 50 ? "fair" : "weak";
  return { score, bullets, doc, words, grade };
}
