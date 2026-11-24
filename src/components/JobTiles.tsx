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
        <div className="flex h-[58px] items-start gap-3">
          <span className="min-w-0 flex-1">
            <CompanyWordmark name={a.company} jobUrl={a.job_url} domain={a.company_domain} logo={a.company_logo} height={34} iconSize={36} nameClass="truncate text-[0.95rem] font-bold text-ink" />
            {a.location && <span className="mt-0.5 flex items-center gap-1 truncate text-[0.8rem] text-muted"><MapPin size={11} />{a.location}</span>}
          </span>
          <span className="flex h-9 shrink-0 items-center gap-2">
            <span className="text-[0.8rem] text-muted">{timeAgo(a.updated_at)}</span>
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

