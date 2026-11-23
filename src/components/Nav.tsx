"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BriefcaseBusiness, House, IndianRupee, LogOut, Menu, Mic, Settings2, UserRound, X } from "lucide-react";
import { Logo } from "./Logo";

const LinkedInIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/interview", label: "Interview practice", icon: Mic },
  { href: "/negotiation", label: "Salary negotiation", icon: IndianRupee },
  { href: "/linkedin", label: "LinkedIn", icon: LinkedInIcon },
  { href: "/profile", label: "My profile", icon: UserRound },
];

export function Nav({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const all = isAdmin ? [...items, { href: "/admin", label: "Admin", icon: Settings2 }] : items;
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  const list = (
    <nav className="flex flex-col gap-1">
      {all.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] transition ${
            isActive(href) ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-ink"
          }`}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-navy text-xs font-semibold text-white">{initials || "?"}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
      </div>
      <button onClick={logout} className="btn-quiet rounded-lg" title="Log out" aria-label="Log out">
        <LogOut size={16} />
      </button>
    </div>
  );

  return (
    <>
      <header className="no-print glass sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <Link href="/"><Logo size={28} /></Link>
        <button className="btn btn-ghost px-2.5 py-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>
      {open && (
        <div className="no-print fixed inset-0 top-[61px] z-20 flex flex-col bg-bg p-4 lg:hidden fade-up">
          {list}
          <div className="mt-auto border-t border-line pt-3">{footer}</div>
        </div>
      )}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col px-4 py-6 lg:flex">
        <Link href="/" className="mb-9 px-2"><Logo /></Link>
        {list}
        <div className="mt-auto border-t border-line pt-3">{footer}</div>
      </aside>
    </>
  );
}
