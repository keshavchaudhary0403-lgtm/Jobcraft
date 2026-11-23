"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BriefcaseBusiness, House, IndianRupee, LogOut, Menu, Mic, PanelLeftClose, PanelLeftOpen, Settings2, UserRound, X } from "lucide-react";
import { Logo, LogoMark } from "./Logo";

const LinkedInIcon = ({ size = 17, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);

type Props = { name: string; isAdmin: boolean; jobs: number; strength: number; mini?: boolean };

export function Nav({ name, isAdmin, jobs, strength, mini: miniInit = false }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(miniInit);

  function toggleMini() {
    const next = !mini;
    setMini(next);
    document.cookie = `nav=${next ? "mini" : "full"}; path=/; max-age=31536000; samesite=lax`;
    document.querySelector("[data-nav]")?.setAttribute("data-nav", next ? "mini" : "full");
  }
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

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
        { href: "/interview", label: "Interviews", icon: Mic },
        { href: "/negotiation", label: "Salary talk", icon: IndianRupee },
      ],
    },
    {
      label: "Account",
      items: [{ href: "/profile", label: "My profile", icon: UserRound }, ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings2 }] : [])],
    },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  const body = (compact: boolean) => (
    <>
      <nav className="space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            {compact ? <div className="mx-auto mb-2 h-px w-6 bg-white/15" /> : <div className="mb-1.5 px-3.5 text-[0.72rem] font-medium text-white/45">{g.label}</div>}
            <div className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon, ...rest }) => {
                const active = isActive(href);
                const count = "count" in rest ? (rest.count as number) : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-label={compact ? label : undefined}
                    className={`group/item relative flex h-10 items-center rounded-full text-[0.95rem] transition ${compact ? "mx-auto w-10 justify-center" : "gap-3 px-3.5"} ${
                      active ? "bg-white font-semibold text-ink shadow-[0_6px_16px_-8px_rgba(0,0,0,.5)]" : "text-white/70 hover:bg-white/[.07] hover:text-white"
                    }`}
                  >
                    <Icon size={17} className={active ? "text-brand" : ""} />
                    {compact ? (
                      <>
                        {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-2 px-1 text-[0.62rem] font-semibold text-side">{count}</span>}
                        <Tip>{label}</Tip>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{label}</span>
                        {count > 0 && <span className={`rounded-full px-2 text-[0.75rem] tabular-nums ${active ? "bg-brand-soft text-brand" : "bg-white/15 text-white/80"}`}>{count}</span>}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        {strength < 100 && !compact && (
          <Link href="/profile" className="block rounded-2xl bg-white/[.08] p-3.5 transition hover:bg-white/[.12]">
            <div className="flex justify-between text-[0.82rem]">
              <span className="text-white/75">Profile strength</span>
              <span className="font-medium text-white">{strength}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-2 to-white" style={{ width: `${strength}%` }} />
            </div>
          </Link>
        )}
        <div className={`flex items-center rounded-xl py-1 ${compact ? "flex-col gap-2" : "gap-2.5 px-1.5"}`}>
          <div className="group/item relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-[0.75rem] font-semibold text-white">
            {initials || "?"}
            {compact && <Tip>{name}</Tip>}
          </div>
          {!compact && <div className="min-w-0 flex-1 truncate text-[0.92rem] text-white/85">{name}</div>}
          <button onClick={logout} className="group/item relative grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white" aria-label="Log out">
            <LogOut size={15} />
            <Tip>Log out</Tip>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-side px-4 py-3 lg:hidden">
        <Link href="/"><Logo light size={26} /></Link>
        <button className="grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>
      {open && <div className="no-print fixed inset-0 top-[57px] z-20 flex flex-col bg-side p-4 lg:hidden">{body(false)}</div>}
      <aside className={`no-print fixed inset-y-0 left-0 z-30 hidden flex-col bg-side py-6 transition-[width] duration-200 lg:flex ${mini ? "w-[76px] px-2" : "w-60 px-3.5"}`}>
        <div className={`mb-7 flex items-center ${mini ? "flex-col gap-4" : "justify-between pl-3"}`}>
          <Link href="/" aria-label="Home">{mini ? <LogoMark size={30} inverse /> : <Logo light />}</Link>
          <button
            onClick={toggleMini}
            className="group/item relative grid h-8 w-8 place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"
            aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}
          >
            {mini ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <Tip>{mini ? "Expand sidebar" : "Collapse sidebar"}</Tip>
          </button>
        </div>
        {body(mini)}
      </aside>
    </>
  );
}

/** Small label shown to the right of an icon on hover (collapsed sidebar). */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[0.82rem] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/item:opacity-100">
      {children}
    </span>
  );
}
