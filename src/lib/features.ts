// No imports - safe in browser components.

/** AI features the admin can switch off or limit per person. `def` = built-in default limit. */
export const FEATURES = {
  generate: { label: "Job tools", desc: "Match analysis, tailored resume, outreach and LinkedIn rewrites", per: "minute", window: 60, def: 20 },
  chat: { label: "Practice chat", desc: "Typed interview, salary and coach conversations (messages)", per: "minute", window: 60, def: 40 },
  detect: { label: "Job auto-fill", desc: "Reading company, role and location from a pasted JD", per: "minute", window: 60, def: 30 },
  parse: { label: "Resume upload", desc: "Reading an uploaded resume", per: "hour", window: 3600, def: 10 },
  insight: { label: "Scorecards", desc: "Interview scorecard and salary offer check", per: "hour", window: 3600, def: 20 },
  voice: { label: "Voice calls", desc: "Realistic voice practice calls started (also needs Voice on)", per: "hour", window: 3600, def: 12 },
} as const;

export type FeatureKey = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
/** Per person or app default: a number = limit, 0 = off, missing = use the default. */
export type FeatureLimits = Partial<Record<FeatureKey, number>>;

export function cleanLimits(input: unknown): FeatureLimits | null {
  if (!input || typeof input !== "object") return null;
  const out: FeatureLimits = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!(k in FEATURES)) return null;
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 10000) return null;
    out[k as FeatureKey] = n;
  }
  return out;
}

/** Effective limit for a person: their own value, else the app default, else built-in. */
export function effectiveLimit(f: FeatureKey, user?: FeatureLimits | null, app?: FeatureLimits | null) {
  return user?.[f] ?? app?.[f] ?? FEATURES[f].def;
}
