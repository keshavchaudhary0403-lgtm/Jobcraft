"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, ChevronUp, House, IndianRupee, LogOut, Menu, Mic, Plus, Settings2, UserRound, X } from "lucide-react";
import { Logo } from "./Logo";

const LinkedInIcon = ({ size = 17, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);

type Props = { name: string; isAdmin: boolean; jobs: number; strength: number };

export function Nav({ name, isAdmin, jobs, strength }: Props) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const groups = [
    {
      label: "Workspace",
      items: [
        { href: "/", label: "Home", icon: House },
        { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness, count: jobs },
        { href: "/linkedin", label: "LinkedIn", icon: LinkedInIcon },
      ],
    },
    {
      label: "Practice",
      items: [
        { href: "/interview", label: "Interview", icon: Mic },
        { href: "/negotiation", label: "Salary", icon: IndianRupee },
      ],
    },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  const body = (
    <>
      <Link href="/jobs/new" onClick={() => setOpen(false)} className="btn btn-clay h-11 w-full"><Plus size={16} /> Add job</Link>
      <nav className="mt-6 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-2 px-3 text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-white/35">{g.label}</div>
            <div className="space-y-1">
              {g.items.map(({ href, label, icon: Icon, ...rest }) => {
                const active = isActive(href);
                const count = "count" in rest ? (rest.count as number) : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex h-11 items-center gap-3 rounded-full px-3.5 text-[0.95rem] transition ${active ? "bg-cream font-semibold text-side" : "text-white/70 hover:bg-white/[.08] hover:text-white"}`}
                  >
                    <Icon size={17} />
                    <span className="flex-1">{label}</span>
                    {count > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.78rem] font-bold tabular-nums ${active ? "bg-clay text-white" : "bg-white/15 text-white"}`}>{count}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div ref={ref} className="relative mt-auto">
        {menu && (
          <div className="pop absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-3xl border border-line bg-card p-2 text-ink shadow-[0_30px_60px_-30px_rgba(22,48,43,.55)]">
            <Link href="/profile" onClick={() => { setMenu(false); setOpen(false); }} className="flex h-11 items-center gap-3 rounded-2xl px-3 text-[0.95rem] hover:bg-line-2"><UserRound size={16} className="text-muted" /> My profile</Link>
            {isAdmin && <Link href="/admin" onClick={() => { setMenu(false); setOpen(false); }} className="flex h-11 items-center gap-3 rounded-2xl px-3 text-[0.95rem] hover:bg-line-2"><Settings2 size={16} className="text-muted" /> Admin</Link>}
            <button onClick={logout} className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-[0.95rem] text-bad hover:bg-bad-soft"><LogOut size={16} /> Log out</button>
          </div>
        )}
        <Link href="/profile" onClick={() => setOpen(false)} className="mb-3 block rounded-2xl bg-white/[.06] px-3.5 py-3 transition hover:bg-white/[.1]">
          <div className="flex justify-between text-[0.8rem]"><span className="text-white/60">Profile strength</span><span className="font-semibold text-cream">{strength}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-mustard" style={{ width: `${strength}%` }} /></div>
        </Link>
        <button onClick={() => setMenu(!menu)} className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition ${menu ? "bg-white/[.1]" : "hover:bg-white/[.06]"}`} aria-label="Account menu">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mustard text-[0.8rem] font-bold text-side">{initials || "?"}</span>
          <span className="min-w-0 flex-1 truncate text-[0.92rem] font-medium text-cream">{name}</span>
          <ChevronUp size={15} className={`text-white/50 transition ${menu ? "" : "rotate-180"}`} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: floating top pill + app-style bottom tab bar */}
      <header className="no-print sticky top-0 z-30 px-3 pt-3 lg:hidden">
        <div className="flex items-center justify-between rounded-full bg-side/95 py-1.5 pl-3 pr-1.5 shadow-[0_12px_30px_-18px_rgba(22,48,43,.9)] backdrop-blur">
          <Link href="/"><Logo size={28} light /></Link>
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-3 text-cream" aria-label="Open menu">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-mustard text-[0.78rem] font-bold text-side">{initials || "?"}</span>
            <Menu size={16} />
          </button>
        </div>
      </header>

      <nav className="no-print fixed inset-x-3 bottom-3 z-30 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5 items-center rounded-[26px] bg-side/95 px-1.5 py-1.5 shadow-[0_18px_40px_-18px_rgba(22,48,43,.9)] backdrop-blur">
          {[
            { href: "/", label: "Home", icon: House },
            { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness, count: jobs },
            null,
            { href: "/interview", label: "Interview", icon: Mic },
            { href: "/negotiation", label: "Salary", icon: IndianRupee },
          ].map((t) =>
            t === null ? (
              <Link key="add" href="/jobs/new" aria-label="Add job" className="mx-auto -mt-7 grid h-14 w-14 place-items-center rounded-full bg-clay text-white shadow-[0_12px_24px_-10px_rgba(224,101,63,.9)] ring-4 ring-bg transition active:scale-95">
                <Plus size={24} />
              </Link>
            ) : (
              <Link key={t.href} href={t.href} className={`relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.7rem] font-medium transition ${isActive(t.href) ? "text-cream" : "text-white/50"}`}>
                <span className={`grid h-8 w-12 place-items-center rounded-full transition ${isActive(t.href) ? "bg-white/15" : ""}`}><t.icon size={19} /></span>
                {t.label}
                {"count" in t && (t.count ?? 0) > 0 && <span className="absolute right-3 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[0.62rem] font-bold text-white">{t.count}</span>}
              </Link>
            ),
          )}
        </div>
      </nav>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-side/40 backdrop-blur-[2px]" />
          <div className="sheet-up absolute inset-x-0 bottom-0 rounded-t-[28px] bg-card p-4 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <div className="flex items-center gap-3 px-1">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-mustard text-[0.9rem] font-bold text-side">{initials || "?"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[1.15rem] font-bold">{name}</div>
                <div className="text-[0.82rem] text-muted">Profile {strength}% complete</div>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-line-2" aria-label="Close"><X size={16} /></button>
            </div>
            <div className="mx-1 mt-3 h-1.5 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-clay" style={{ width: `${strength}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { href: "/linkedin", label: "LinkedIn", icon: LinkedInIcon },
                { href: "/profile", label: "My profile", icon: UserRound },
                ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings2 }] : []),
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 font-semibold ${isActive(href) ? "border-side bg-side text-cream" : "border-line"}`}>
                  <Icon size={18} /> {label}
                </Link>
              ))}
              <button onClick={logout} className="flex items-center gap-3 rounded-2xl border-[1.5px] border-line px-4 py-3.5 font-semibold text-bad"><LogOut size={18} /> Log out</button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: floating rail */}
      <aside className="no-print fixed inset-y-3 left-3 z-30 hidden w-[232px] flex-col rounded-[28px] bg-side p-4 shadow-[0_20px_50px_-30px_rgba(22,48,43,.9)] lg:flex">
        <Link href="/" className="mb-6 px-1.5 pt-1"><Logo size={32} light /></Link>
        {body}
      </aside>
    </>
  );
}
