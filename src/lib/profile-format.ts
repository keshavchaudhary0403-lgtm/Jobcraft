/**
 * One set of rules for the profile "Basics", used everywhere a value comes in:
 * typed by the user, filled from a resume, or saved from the salary form.
 * Every value is stored in one clear shape so the AI (and the user) read it the same way.
 */

const squish = (s: string) => s.replace(/\s+/g, " ").trim();
const num = (n: number) => String(Math.round(n * 10) / 10);

/** "keshav teotia" / "KESHAV TEOTIA" -> "Keshav Teotia". Mixed case is left as typed. */
export function formatName(v: string | null | undefined): string {
  const s = squish(v ?? "").replace(/[^\p{L}\p{M}\s.'-]/gu, "");
  if (!s) return "";
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
}

/** Titles and roles: single spaces, no trailing punctuation, sensible length. */
export function formatTitle(v: string | null | undefined, max = 90): string {
  return squish(v ?? "").replace(/[.,;:\s]+$/, "").slice(0, max);
}

/** City: title-cased when typed all lower/upper; "delhi ncr" -> "Delhi NCR". */
export function formatCity(v: string | null | undefined): string {
  const s = squish(v ?? "").replace(/[.,;:\s]+$/, "");
  if (!s) return "";
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/(^|[\s/(-])\p{L}/gu, (m) => m.toUpperCase())
    .replace(/\bNcr\b/g, "NCR");
}

/**
 * Experience -> "5 years", "5+ years", "4.5 years", "Less than 1 year".
 * Reads "5", "5+", "about 4 years", "4 yrs 6 months", "fresher". Returns null when it can't.
 */
export function formatExperience(v: string | null | undefined): string | null {
  const s = squish(v ?? "").toLowerCase();
  if (!s) return "";
  if (/fresher|no experience|^0+(\.0+)?$/.test(s)) return "Less than 1 year";
  const y = s.match(/(\d+(?:\.\d+)?)\s*(\+)?/);
  if (!y) return null;
  let years = parseFloat(y[1]);
  const plus = !!y[2] || /more than|over|\bplus\b/.test(s);
  const m = s.match(/(\d+)\s*(?:months?|mos?)\b/);
  if (/^\d+(\.\d+)?\s*(months?|mos?)\b/.test(s)) years = parseFloat(y[1]) / 12;
  else if (m && m.index !== y.index) years += parseInt(m[1], 10) / 12;
  if (!isFinite(years) || years > 50) return null;
  if (years < 1) return "Less than 1 year";
  const n = num(years);
  return `${n}${plus ? "+" : ""} year${n === "1" && !plus ? "" : "s"}`;
}
/** The editable part of a stored experience value: "5+ years" -> "5+". */
export const experienceInput = (v: string) => v.replace(/\s*years?$/i, "").replace(/^Less than 1$/i, "0");

/**
 * CTC -> "₹15.5 LPA". Reads "15.5", "15.5LPA", "15.5 lakh", "₹15,50,000", "1.2 Cr".
 * Returns null when it isn't a believable yearly CTC.
 */
export function formatCtc(v: string | null | undefined): string | null {
  const s = squish(v ?? "").toLowerCase().replace(/rs\.?|inr|₹/g, "");
  if (!s) return "";
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let lakh = parseFloat(m[1]);
  if (/cr|crore/.test(s)) lakh *= 100;
  else if (/\d\s*k\b|thousand/.test(s)) lakh /= 100;
  else if (!/l|lakh|lac|lpa/.test(s) && lakh >= 1000) lakh /= 100000; // a full rupee amount
  if (!isFinite(lakh) || lakh < 0.5 || lakh > 1000) return null;
  return `₹${num(lakh)} LPA`;
}
/** The editable part of a stored CTC: "₹15.5 LPA" -> "15.5". */
export const ctcInput = (v: string) => v.replace(/₹|\s*LPA$/gi, "").trim();

/** LinkedIn -> "https://www.linkedin.com/in/<slug>". Returns null when it isn't a profile link. */
export function formatLinkedIn(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return "";
  const m = s.match(/linkedin\.com\/in\/([^/?#\s]+)/i) ?? (/^[a-z0-9][a-z0-9-_%]{2,99}$/i.test(s) ? [s, s] : null);
  if (!m) return null;
  return `https://www.linkedin.com/in/${m[1].replace(/\/+$/, "")}`;
}
/** The editable part of a stored LinkedIn URL: the slug. */
export const linkedInInput = (v: string) => v.match(/linkedin\.com\/in\/([^/?#\s]+)/i)?.[1] ?? v;

export const FIELD_ERRORS = {
  experience_years: "Enter years as a number, e.g. 4 or 5+",
  current_ctc: "Enter your yearly CTC in lakh, e.g. 15.5",
  linkedin_url: "Paste your profile link, e.g. linkedin.com/in/your-name",
} as const;

type Basics = {
  full_name?: string | null;
  current_title?: string | null;
  target_role?: string | null;
  experience_years?: string | null;
  city?: string | null;
  current_ctc?: string | null;
  linkedin_url?: string | null;
  skills?: string[] | null;
};

/** Clean every basic field. Values that can't be read are kept as typed and reported in `errors`. */
export function normaliseBasics<T extends Basics>(p: T): { value: T; errors: Partial<Record<keyof typeof FIELD_ERRORS, string>> } {
  const errors: Partial<Record<keyof typeof FIELD_ERRORS, string>> = {};
  const out = { ...p };
  if ("full_name" in p) out.full_name = formatName(p.full_name);
  if ("current_title" in p) out.current_title = formatTitle(p.current_title);
  if ("target_role" in p) out.target_role = formatTitle(p.target_role, 120);
  if ("city" in p) out.city = formatCity(p.city);
  for (const [k, fn] of [
    ["experience_years", formatExperience],
    ["current_ctc", formatCtc],
    ["linkedin_url", formatLinkedIn],
  ] as const) {
    if (!(k in p)) continue;
    const r = fn(p[k]);
    if (r === null) errors[k] = FIELD_ERRORS[k];
    else out[k] = r;
  }
  if (p.skills) {
    const seen = new Set<string>();
    out.skills = p.skills.map((s) => squish(s).slice(0, 40)).filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase())).slice(0, 25);
  }
  return { value: out, errors };
}

/** For data that has no user in front of it (resume import): drop what can't be read. */
export function cleanBasics<T extends Basics>(p: T): T {
  const { value, errors } = normaliseBasics(p);
  for (const k of Object.keys(errors) as (keyof typeof errors)[]) (value as Basics)[k] = null;
  return value;
}
