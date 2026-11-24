"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, ChevronRight, ChevronUp, House, IndianRupee, LogOut, Menu, Mic, Plus, Settings2, UserRound, X } from "lucide-react";
import { Logo } from "./Logo";
import { LinkedInIcon } from "./icons";

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
            <div className="mb-2 px-3 text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-white/60">{g.label}</div>
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
                    {count > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.78rem] font-bold tabular-nums ${active ? "bg-white text-side" : "bg-white/15 text-white"}`}>{count}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div ref={ref} className="relative mt-auto">
        {menu && (
          <div className="pop absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-3xl border border-line bg-card p-2 text-ink shadow-[0_30px_60px_-30px_color-mix(in_srgb,var(--side)_55%,transparent)]">
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
          <span className="avatar-warm grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8rem] font-bold">{initials || "?"}</span>
          <span className="min-w-0 flex-1 truncate text-[0.92rem] font-medium text-cream">{name}</span>
          <ChevronUp size={15} className={`text-white/65 transition ${menu ? "" : "rotate-180"}`} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: floating top bar + app-style bottom tab bar */}
      <header className="no-print sticky top-0 z-30 px-4 pt-3 sm:px-6 lg:hidden">
        <div className="rail-bg flex h-14 items-center justify-between rounded-[20px] bg-side pl-3.5 pr-2 shadow-[0_12px_30px_-18px_color-mix(in_srgb,var(--side)_90%,transparent)]">
          <Link href="/" aria-label="Home" className="flex items-center"><Logo size={30} light /></Link>
          <div className="flex items-center gap-2">
            <span aria-hidden className="avatar-warm grid h-9 w-9 select-none place-items-center rounded-full text-[0.8rem] font-bold ring-2 ring-white/25">{initials || "?"}</span>
            <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-[14px] bg-white/12 text-white transition active:scale-95" aria-label="Open menu">
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <nav className="no-print fixed inset-x-3 bottom-3 z-30 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5 items-center rail-bg rounded-[26px] bg-side/95 px-1.5 py-1.5 shadow-[0_18px_40px_-18px_color-mix(in_srgb,var(--side)_90%,transparent)] backdrop-blur">
          {[
            { href: "/", label: "Home", icon: House },
            { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness, count: jobs },
            null,
            { href: "/interview", label: "Interview", icon: Mic },
            { href: "/negotiation", label: "Salary", icon: IndianRupee },
          ].map((t) =>
            t === null ? (
              <Link key="add" href="/jobs/new" aria-label="Add job" className="mx-auto -mt-7 grid h-14 w-14 place-items-center rounded-full bg-clay text-white shadow-[0_12px_24px_-10px_color-mix(in_srgb,var(--clay)_90%,transparent)] ring-4 ring-bg transition active:scale-95">
                <Plus size={24} />
              </Link>
            ) : (
              <Link key={t.href} href={t.href} className={`relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.7rem] font-medium transition ${isActive(t.href) ? "text-cream" : "text-white/65"}`}>
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
          <div className="absolute inset-0 bg-side/45 backdrop-blur-[3px]" />
          <div className="sheet-up absolute inset-x-0 bottom-0 rounded-t-[30px] bg-bg px-4 pt-3 shadow-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }} onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[1.3rem] font-bold">Menu</h2>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm" aria-label="Close"><X size={16} /></button>
            </div>

            {/* Profile card in the app's hero style */}
            <Link href="/profile" onClick={() => setOpen(false)} className="dark-card block rounded-[22px] p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="avatar-warm grid h-12 w-12 shrink-0 place-items-center rounded-full text-[0.95rem] font-bold ring-2 ring-white/25">{initials || "?"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[1.15rem] font-bold">{name}</span>
                  <span className="block text-[0.8rem] text-white/65">Profile strength</span>
                </span>
                <span className="font-display text-[1.4rem] font-bold">{strength}<span className="text-[0.85rem] text-white/60">%</span></span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-mustard" style={{ width: `${strength}%` }} /></div>
            </Link>

            {/* Destinations */}
            <div className="card mt-3 divide-y divide-line overflow-hidden p-0">
              {[
                { href: "/linkedin", label: "LinkedIn", sub: "Headline, About and skills", icon: LinkedInIcon, tone: 1 },
                { href: "/profile", label: "My profile", sub: "Details and resume", icon: UserRound, tone: 0 },
                ...(isAdmin ? [{ href: "/admin", label: "Admin", sub: "People, limits and AI spend", icon: Settings2, tone: 4 }] : []),
              ].map(({ href, label, sub, icon: Icon, tone }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 active:bg-line-2">
                  <span data-tone={tone} className="tone-chip grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-line-2"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold ${isActive(href) ? "text-brand" : ""}`}>{label}</span>
                    <span className="block truncate text-[0.8rem] text-muted">{sub}</span>
                  </span>
                  {isActive(href) ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.72rem] font-semibold text-brand">Here</span> : <ChevronRight size={17} className="text-faint" />}
                </Link>
              ))}
            </div>

            <button onClick={logout} className="card mt-3 flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bad-soft text-bad"><LogOut size={18} /></span>
              <span className="flex-1 font-semibold text-bad">Log out</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop: floating rail */}
      <aside className="no-print fixed inset-y-3 left-3 z-30 hidden w-[232px] flex-col rounded-[28px] bg-side p-4 shadow-[0_20px_50px_-30px_color-mix(in_srgb,var(--side)_90%,transparent)] lg:flex">
        <Link href="/" className="mb-6 flex items-center px-1.5 pt-1"><Logo size={32} light /></Link>
        {body}
      </aside>
    </>
  );
}
