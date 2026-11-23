"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  { href: "/", label: "Dashboard", icon: "◎" },
  { href: "/profile", label: "My details & resume", icon: "▤" },
  { href: "/linkedin", label: "LinkedIn profile", icon: "in" },
  { href: "/applications", label: "Job applications", icon: "▦" },
  { href: "/interview", label: "Interview practice", icon: "◐" },
  { href: "/negotiation", label: "Salary negotiation", icon: "₹" },
];

export function Nav({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const all = isAdmin ? [...items, { href: "/admin", label: "Admin · users", icon: "⚙" }] : items;

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const list = (
    <nav className="flex flex-col gap-0.5">
      {all.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
            isActive(it.href) ? "bg-accent-soft text-accent font-medium" : "text-ink/80 hover:bg-[#f1eee8]"
          }`}
        >
          <span className="w-5 text-center text-xs font-semibold opacity-70">{it.icon}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="no-print lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 backdrop-blur px-4 py-3">
        <Link href="/" className="font-serif text-xl text-accent">Jobcraft</Link>
        <button className="btn btn-ghost px-3 py-1.5" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? "Close" : "Menu"}
        </button>
      </header>
      {open && (
        <div className="no-print lg:hidden fixed inset-0 top-[57px] z-20 bg-paper p-4 overflow-y-auto">
          {list}
          <button onClick={logout} className="mt-6 text-sm text-muted">Log out</button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="no-print hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-line bg-paper px-4 py-6">
        <Link href="/" className="font-serif text-2xl text-accent px-3 mb-8">Jobcraft</Link>
        {list}
        <div className="mt-auto px-3 pt-6 border-t border-line">
          <div className="text-sm font-medium truncate">{name}</div>
          <button onClick={logout} className="text-xs text-muted hover:text-ink mt-1">Log out</button>
        </div>
      </aside>
    </>
  );
}
