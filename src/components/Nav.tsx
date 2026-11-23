"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BriefcaseBusiness, House, IndianRupee, LogOut, Menu, Mic, Settings2, UserRound, X } from "lucide-react";
import { Logo } from "./Logo";

const LinkedInIcon = ({ size = 17, className }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);

type Props = { name: string; isAdmin: boolean; jobs: number; strength: number };

export function Nav({ name, isAdmin, jobs, strength }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
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

  const body = (
    <>
      <nav className="space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-1.5 px-3.5 text-[0.72rem] font-medium text-white/45">{g.label}</div>
            <div className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon, ...rest }) => {
                const active = isActive(href);
                const count = "count" in rest ? (rest.count as number) : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex h-10 items-center gap-3 rounded-full px-3.5 text-[0.95rem] transition ${
                      active ? "bg-white font-semibold text-ink shadow-[0_6px_16px_-8px_rgba(0,0,0,.5)]" : "text-white/70 hover:bg-white/[.07] hover:text-white"
                    }`}
                  >
                    <Icon size={17} className={active ? "text-brand" : ""} />
                    <span className="flex-1">{label}</span>
                    {count > 0 && <span className={`rounded-full px-2 text-[0.75rem] tabular-nums ${active ? "bg-brand-soft text-brand" : "bg-white/15 text-white/80"}`}>{count}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        {strength < 100 && (
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
        <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-[0.75rem] font-semibold text-white">{initials || "?"}</div>
          <div className="min-w-0 flex-1 truncate text-[0.92rem] text-white/85">{name}</div>
          <button onClick={logout} className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white" title="Log out" aria-label="Log out">
            <LogOut size={15} />
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
      {open && <div className="no-print fixed inset-0 top-[57px] z-20 flex flex-col bg-side p-4 lg:hidden">{body}</div>}
      <aside className="no-print fixed bottom-2.5 left-2.5 top-2.5 hidden w-60 flex-col rounded-l-[28px] bg-side px-3.5 py-6 lg:flex">
        <Link href="/" className="mb-7 px-3"><Logo light /></Link>
        {body}
      </aside>
    </>
  );
}
