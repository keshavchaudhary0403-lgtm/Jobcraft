import type { InterviewReport, OfferCheck } from "@/lib/tasks";

export type RoundRow = { id: string; created_at: string; report: InterviewReport | null; offer: OfferCheck | null };
export type PracticeGroup = { key: string; title: string; company: string | null; rounds: RoundRow[] };

/** Group sessions by job (or by custom role when there's no job), newest activity first. */
export function groupRounds(sessions: { id: string; created_at: string; updated_at: string; title: string | null; application_id: string | null; meta: unknown }[], companyOf: (s: { application_id: string | null; meta: unknown }) => string | null): PracticeGroup[] {
  const map = new Map<string, PracticeGroup & { last: string }>();
  for (const s of [...sessions].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const key = s.application_id ?? `t:${s.title}`;
    const m = (s.meta ?? {}) as { interview_report?: InterviewReport; offer_check?: OfferCheck };
    const g = map.get(key) ?? { key, title: s.title ?? "Practice", company: companyOf(s), rounds: [], last: s.updated_at };
    g.rounds.push({ id: s.id, created_at: s.created_at, report: m.interview_report ?? null, offer: m.offer_check ?? null });
    if (s.updated_at > g.last) g.last = s.updated_at;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last)).map(({ last: _l, ...g }) => (void _l, g));
}
