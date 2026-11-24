import Link from "next/link";
import type { Status } from "@/lib/types";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 fade-up">
      <div>
        <h1 className="text-[2.1rem] font-bold leading-[1.05]">{title}</h1>
        {sub && <p className="mt-1.5 text-[1rem] text-muted">{sub}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  saved: { label: "Saved", cls: "bg-mustard-soft text-mustard-ink", dot: "bg-mustard" },
  applied: { label: "Applied", cls: "bg-ocean-soft text-ocean", dot: "bg-ocean" },
  interviewing: { label: "Interviewing", cls: "bg-plum-soft text-plum", dot: "bg-plum" },
  offer: { label: "Offer", cls: "bg-good-soft text-good", dot: "bg-good" },
  rejected: { label: "Rejected", cls: "bg-bad-soft text-bad", dot: "bg-bad" },
  withdrawn: { label: "Withdrawn", cls: "bg-line-2 text-muted", dot: "bg-faint" },
};

export function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className={`chip ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function scoreColor(score: number) {
  return score >= 7 ? "var(--good)" : score >= 5 ? "var(--mid)" : "var(--bad)";
}

export function MatchChip({ score }: { score: number }) {
  const cls = score >= 7 ? "bg-good-soft text-good" : score >= 5 ? "bg-mid-soft text-mid" : "bg-bad-soft text-bad";
  return <span className={`chip ${cls}`}>{score * 10}% match</span>;
}

/** Slim progress bar: the app's one way to show a share or score (no rings). value is 0..1. */
export function Meter({ value, color = "var(--brand)", track = "var(--line)", height = 6, className = "" }: { value: number; color?: string; track?: string; height?: number; className?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={`w-full overflow-hidden rounded-full ${className}`} style={{ height, background: track }}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v > 0 ? Math.max(v * 100, 3) : 0}%`, background: color }} />
    </div>
  );
}

/** Segmented steps for small counts like 2 of 3. */
export function Steps({ done, total, color = "var(--brand)", track = "var(--line)", height = 6, className = "" }: { done: number; total: number; color?: string; track?: string; height?: number; className?: string }) {
  return (
    <div className={`flex w-full gap-1 ${className}`} style={{ height }}>
      {Array.from({ length: Math.max(total, 1) }, (_, i) => <span key={i} className="flex-1 rounded-full" style={{ background: i < done ? color : track }} />)}
    </div>
  );
}

/** Score out of 10 as a number plus a bar. */
export function ScoreRing({ score }: { score: number; size?: number; stroke?: number; label?: boolean }) {
  return (
    <div className="w-28">
      <div className="font-display text-[2rem] font-bold leading-none tabular-nums">{score}<span className="text-[0.95rem] text-faint">/10</span></div>
      <Meter value={score / 10} color={scoreColor(score)} className="mt-2" />
    </div>
  );
}

// Soft tinted monograms (like app icons) - never loud solid blocks.
export { CompanyAvatar } from "./CompanyAvatar";

const TONES = { sky: "bg-ocean-soft text-ocean", sun: "bg-mustard-soft text-mustard-ink", lilac: "bg-plum-soft text-plum", rose: "bg-bad-soft text-bad", mint: "bg-brand-soft text-brand" };
export function StatTile({ icon, label, value, sub, tone = "sky", href, interactive }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tone?: keyof typeof TONES; href?: string; interactive?: boolean }) {
  const Tag = href ? Link : "div";
  return (
    <Tag href={href as string} className={`card flex h-full items-center gap-3.5 p-4 ${href || interactive ? "card-hover cursor-pointer" : ""}`}>
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[0.82rem] text-muted">{label}</div>
        <div className="text-[1.45rem] font-semibold leading-tight tracking-tight tabular-nums">{value}</div>
        {sub && <div className="truncate text-[0.78rem] text-faint" data-tip={sub}>{sub}</div>}
      </div>
    </Tag>
  );
}

export function Empty({ icon, title, sub, action }: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center fade-up">
      {icon && <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-ink">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {sub && <div className="mt-1 max-w-sm text-muted">{sub}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** 0-100: how complete the candidate file is. */
export function profileStrength(p: { master_resume: string | null; target_role: string | null; strongest_proof: string | null; skills: string[] | null; current_ctc: string | null; linkedin_url: string | null; city: string | null }) {
  const checks = [
    [!!p.master_resume && p.master_resume.length > 300, 40],
    [!!p.target_role, 15],
    [!!p.strongest_proof, 15],
    [(p.skills?.length ?? 0) >= 5, 10],
    [!!p.city, 5],
    [!!p.current_ctc, 8],
    [!!p.linkedin_url, 7],
  ] as const;
  return checks.reduce((t, [ok, w]) => t + (ok ? w : 0), 0);
}

/** Standard section card: clear header (icon + title + divider) then body. Used across the app. */
export function Panel({
  title,
  icon,
  action,
  sub,
  children,
  className = "",
  bodyClass = "p-5",
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  sub?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
        {icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="font-display text-[1.05rem] font-bold leading-tight">{title}</div>
          {sub && <div className="text-[0.8rem] text-muted">{sub}</div>}
        </div>
        {action}
      </div>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** Sub-heading inside a card. */
export function SubLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">{children}</div>;
}

/**
 * KPI card: label + icon, big value, and context - a progress bar against a limit/goal,
 * or a stacked breakdown - so the number answers "am I on track?".
 */
export function Kpi({
  icon,
  tone = "sky",
  label,
  value,
  unit,
  note,
  progress,
  breakdown,
  href,
}: {
  icon: React.ReactNode;
  tone?: keyof typeof TONES;
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  progress?: { value: number; max: number; caption?: string; limit?: boolean };
  breakdown?: { label: string; n: number; cls: string }[];
  href?: string;
}) {
  const pct = progress && progress.max > 0 ? Math.min(100, (progress.value / progress.max) * 100) : 0;
  const total = breakdown?.reduce((t, b) => t + b.n, 0) ?? 0;
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[0.86rem] font-medium text-muted">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${TONES[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[1.7rem] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-[0.9rem] text-muted">{unit}</span>}
      </div>
      {progress && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-line-2">
            <div className={`h-full rounded-full transition-all duration-700 ${progress.limit && pct >= 90 ? "bg-bad" : progress.limit && pct >= 70 ? "bg-orange-400" : "bg-brand"}`} style={{ width: `${Math.max(pct, progress.value > 0 ? 3 : 0)}%` }} />
          </div>
          {progress.caption && <div className="mt-1.5 text-[0.8rem] text-muted">{progress.caption}</div>}
        </div>
      )}
      {breakdown && (
        <div className="mt-3">
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-line-2">
            {total > 0 && breakdown.filter((b) => b.n).map((b) => <div key={b.label} className={b.cls} style={{ width: `${(b.n / total) * 100}%` }} />)}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.78rem] text-muted">
            {(breakdown.some((b) => b.n) ? breakdown.filter((b) => b.n) : breakdown.slice(0, 1)).map((b) => (
              <span key={b.label} className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${b.cls}`} />{b.n} {b.label}</span>
            ))}
          </div>
        </div>
      )}
      {note && <div className="mt-2 text-[0.8rem] text-muted">{note}</div>}
    </>
  );
  const cls = "card flex h-full flex-col p-4";
  return href ? <Link href={href} className={`${cls} card-hover`}>{body}</Link> : <div className={cls}>{body}</div>;
}
