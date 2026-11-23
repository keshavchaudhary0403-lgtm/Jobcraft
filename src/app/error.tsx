"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="text-[1.3rem] font-bold">Something went wrong</div>
        <p className="mt-2 text-muted">Your data is safe. Try again - if it keeps happening, let your admin know.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn btn-primary" onClick={reset}><RotateCcw size={15} /> Try again</button>
          <Link className="btn btn-ghost" href="/">Go home</Link>
        </div>
      </div>
    </main>
  );
}
