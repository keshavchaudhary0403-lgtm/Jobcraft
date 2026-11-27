import Link from "next/link";
import { CompanyWordmark } from "./CompanyWordmark";
import { ArrowRight, MapPin } from "lucide-react";
import { FitBadge, STATUS_META, timeAgo } from "./ui";
import { STATUSES, type Application, type Status } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { journey } from "@/lib/journey";

export const STATUS_BAR: Record<Status, string> = {
  saved: "bg-mustard",
  applied: "bg-ocean",
  interviewing: "bg-plum",
  offer: "bg-good",
  rejected: "bg-bad",
  withdrawn: "bg-faint",
};

export function JobTile({ a, practised }: { a: Application; practised: Set<string> }) {
  const an = a.analysis as Analysis | null;
  const m = an ? an.fit_score * 10 : null;
  const steps = journey(a, practised);
  const cur = steps.findIndex((s) => !s.done);
  const next = cur >= 0 && !["rejected", "withdrawn"].includes(a.status) ? steps[cur] : null;
  const st = STATUS_META[a.status];
  return (
    <article className="card card-hover flex flex-col overflow-hidden">
      <Link href={`/jobs/${a.id}`} className="block p-6 pb-5">
        {/* Fixed-height header (room for the location line even when there is none), so the title
            and the match % sit in exactly the same spot on every card. */}
        <div className="flex h-[64px] items-start gap-3">
          <span className="min-w-0 flex-1">
            <CompanyWordmark name={a.company} jobUrl={a.job_url} domain={a.company_domain} logo={a.company_logo} height={34} iconSize={36} nameClass="truncate text-[0.95rem] font-bold text-ink" />
            {a.location && <span className="mt-2 flex items-center gap-1.5 truncate text-[0.82rem] text-muted"><MapPin size={13} className="shrink-0" />{a.location}</span>}
          </span>
          <span className="flex h-9 shrink-0 items-center gap-2">
            <span className="text-[0.8rem] text-muted" suppressHydrationWarning>{timeAgo(a.updated_at)}</span>
            <span className={`chip ${st.cls}`}>{st.label}</span>
          </span>
        </div>
        <div className="mt-2 flex min-h-[3.2rem] items-start justify-between gap-4">
          <h2 className="line-clamp-2 text-[1.45rem] font-bold leading-[1.1] hover:text-brand">{a.role}</h2>
          <FitBadge value={m} />
        </div>
      </Link>

      {next ? (
        <Link href={next.href} className="group mt-auto flex items-center justify-between gap-3 border-t border-line px-6 py-3.5">
          <span className="min-w-0">
            <span className="block text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted">Next step</span>
            <span className="block truncate font-semibold text-ink">{next.cta}</span>
          </span>
          <span className="pill-action shrink-0">Start <ArrowRight size={14} /></span>
        </Link>
      ) : (
        <Link href={`/jobs/${a.id}`} className="group mt-auto flex items-center justify-end border-t border-line px-6 py-3.5"><span className="pill-nav">Open job <ArrowRight size={14} /></span></Link>
      )}
    </article>
  );
}

export const STATUS_HEX: Record<Status, string> = { saved: "var(--mustard)", applied: "var(--ocean)", interviewing: "var(--plum)", offer: "var(--good)", rejected: "var(--clay)", withdrawn: "var(--faint)" };

/** Horizontal stacked bar of job statuses: reads well at any width, including phones. */
/** Status colours readable on the blue banners. */
export const STATUS_ON_DARK: Record<Status, string> = { saved: "#9cc7f5", applied: "#ffffff", interviewing: "#7fe0d3", offer: "#5fd99a", rejected: "#ff8a80", withdrawn: "rgba(255,255,255,.4)" };

export function StatusBar({ counts, total, height = 12, dark = false }: { counts: Record<Status, number>; total: number; height?: number; dark?: boolean }) {
  const present = STATUSES.filter((s) => counts[s]);
  return (
    <div className="flex w-full gap-1" style={{ height }}>
      {total === 0 ? <span className={`flex-1 rounded-full ${dark ? "bg-white/15" : "bg-line-2"}`} /> : present.map((s) => (
        <span key={s} data-tip={`${STATUS_META[s].label}: ${counts[s]}`} className="rounded-full" style={{ flex: counts[s], background: dark ? STATUS_ON_DARK[s] : STATUS_HEX[s] }} />
      ))}
    </div>
  );
}

export function StatusDonut({ counts, total, size = 170, className = "mx-auto mt-3" }: { counts: Record<Status, number>; total: number; size?: number; className?: string }) {
  const stroke = Math.round(size * 0.13), r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const present = STATUSES.filter((s) => counts[s]);
  const gap = present.length > 1 ? 4 : 0;
  const segs = present.map((s, i) => ({ s, len: (counts[s] / total) * c, start: present.slice(0, i).reduce((t, x) => t + (counts[x] / total) * c, 0) }));
  return (
    <div className={`donut-3d relative grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {segs.map(({ s, len, start }) => (
          <circle key={s} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={STATUS_HEX[s]} strokeWidth={stroke} strokeDasharray={`${Math.max(len - gap, 1)} ${c}`} strokeDashoffset={-start} />
        ))}
      </svg>
      <div className="donut-hub" style={{ inset: stroke + 5 }}>
        <div className="font-display font-bold leading-none tabular-nums" style={{ fontSize: size * 0.2 }}>{total}</div>
        {size >= 100 && <div className="text-[0.76rem] text-muted">job{total === 1 ? "" : "s"}</div>}
      </div>
    </div>
  );
}


// Column widths shared by the job rows and their header (JobRowHeader), so labels sit exactly over the values.
const COL = {
  company: (wide: boolean) => `hidden min-w-0 shrink-0 sm:block ${wide ? "w-[180px] xl:w-auto xl:flex-[1] xl:shrink" : "w-[180px]"}`,
  role: (wide: boolean) => `min-w-0 flex-1 ${wide ? "xl:flex-[1.4]" : ""}`,
  fit: (headed: boolean) => `flex shrink-0 ${headed ? "w-[3.25rem] justify-center" : "w-[7.5rem] justify-end"}`,
  // Headed lists: Next step gives up part of its share to a gap at the row's end, so Match and the bin sit close to Next step
  // (company and role keep the same widths).
  next: (headed: boolean) => `hidden min-w-[180px] xl:block ${headed ? "flex-[0.6]" : "flex-[1.1]"}`,
  gap: "hidden flex-[0.5] xl:-ml-20 xl:block", // -ml offsets the row gap and the bin's xl:ml-14, so other columns don't move
};

/** Column labels for a headed job list (Jobs page). `lead` / `trailing` are spacers matching the rows' extras. */
export function JobRowHeader({ lead, trailing }: { lead?: React.ReactNode; trailing?: React.ReactNode }) {
  const label = "text-[0.76rem] font-bold uppercase tracking-[0.12em] text-brand-ink";
  return (
    <>
      {lead}
      <span className={`${COL.company(true)} ${label}`}>Company</span>
      <span className={`${COL.role(true)} ${label}`}>Role</span>
      <span className={`${COL.next(true)} ${label}`}>Next step</span>
      <span className={`${COL.fit(true)} ${label}`}>Match</span>
      {trailing}
      <span className={COL.gap} />
    </>
  );
}

/**
 * One job as a compact row - the app's standard way to list jobs (Jobs page, Home, practice pickers).
 * Pure layout: the caller wraps it in a link, a checkbox button or a radio button and passes `lead` (e.g. the box).
 * The status chip shows beside the role only once the job has moved past "Saved" (every job starts there).
 */
export function JobRowContent({ a, practised, lead, showNext = true, showTime = true, action, headed = false, trailing }: {
  a: Application;
  practised?: Set<string>;
  lead?: React.ReactNode;
  showNext?: boolean;
  showTime?: boolean;
  /** Shown in the "Next" column in place of the next-step text (e.g. an Analyse button). */
  action?: React.ReactNode;
  /** Under a JobRowHeader: no "Next:" prefix, and a narrow match column (just the %, nothing until analysed). */
  headed?: boolean;
  trailing?: React.ReactNode;
}) {
  const an = a.analysis as Analysis | null;
  const steps = showNext ? journey(a, practised ?? new Set()) : [];
  const next = showNext && !["rejected", "withdrawn"].includes(a.status) ? steps.find((s) => !s.done) : undefined;
  const st = STATUS_META[a.status];
  const fit = an ? an.fit_score * 10 : null;
  return (
    <>
      {lead}
      <span className={COL.company(showNext)}>
        <CompanyWordmark name={a.company} jobUrl={a.job_url} domain={a.company_domain} logo={a.company_logo} height={24} iconSize={30} nameClass="truncate text-[0.95rem] font-bold text-ink" />
      </span>
      <span className={COL.role(showNext)}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-[1.05rem] font-bold leading-snug text-ink" title={a.role}>{a.role}</span>
          {a.status !== "saved" && <span className={`chip shrink-0 ${st.cls}`}>{st.label}</span>}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.88rem] text-muted">
          <span className="truncate font-semibold text-ink sm:hidden">{a.company}</span>
          {a.location && <span className="hidden min-w-0 items-center gap-1 truncate sm:flex"><MapPin size={12} className="shrink-0" />{a.location}</span>}
          {showTime && <span className="hidden shrink-0 whitespace-nowrap md:inline" suppressHydrationWarning>{a.location && <span className="mr-1.5">·</span>}{timeAgo(a.updated_at)}</span>}
        </span>
      </span>
      {action ? (
        <span className={`relative z-10 flex shrink-0 xl:min-w-[180px] ${headed ? "xl:flex-[0.6]" : "xl:flex-[1.1]"}`}>{action}</span>
      ) : (
        // Kept (empty) for closed jobs too, so every row's columns line up.
        showNext && <span className={`${COL.next(headed)} truncate text-[0.9rem] font-semibold text-ink`} title={next?.cta}>{next && <>{!headed && <span className="font-normal text-muted">Next: </span>}{next.cta}</>}</span>
      )}
      <span className={COL.fit(headed)}>{(fit != null || !headed) && <FitBadge value={fit} size="sm" className="whitespace-nowrap" />}</span>
      {trailing}
      {headed && <span className={COL.gap} />}
    </>
  );
}
