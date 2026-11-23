import Link from "next/link";
import { ArrowRight, IndianRupee, Mic } from "lucide-react";
import type { Application, Session } from "@/lib/types";
import { startSession } from "@/lib/actions";
import { timeAgo } from "@/components/ui";

export function PracticeTab({ app, interviews }: { app: Application; interviews: Session[] }) {
  const start = startSession.bind(null, "interview");
  return (
    <div className="grid gap-5 md:grid-cols-2 stagger">
      <div className="card flex flex-col p-6">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink text-on-brand"><Mic size={20} /></div>
        <div className="mt-4 text-[16px] font-medium">Mock interview</div>
        <p className="mt-1 text-[14px] text-muted">The hiring manager at {app.company} asks 6 questions by voice, then scores you.</p>
        <form action={start} className="mt-5">
          <input type="hidden" name="application_id" value={app.id} />
          <button className="btn btn-brand">Start interview <ArrowRight size={16} /></button>
        </form>
        {interviews.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-2 eyebrow">Past rounds</div>
            {interviews.slice(0, 4).map((s, i) => (
              <Link key={s.id} href={`/interview/${s.id}`} className="flex justify-between rounded-lg px-2 py-1.5 text-[14px] hover:bg-slate-50">
                <span>Round {interviews.length - i}</span>
                <span className="text-muted">{timeAgo(s.updated_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="card flex flex-col p-6">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sun text-brand"><IndianRupee size={20} /></div>
        <div className="mt-4 text-[16px] font-medium">Salary negotiation</div>
        <p className="mt-1 text-[14px] text-muted">Got an offer? Check it against the market, then practise with HR.</p>
        <Link href={`/negotiation?app=${app.id}`} className="btn btn-ghost mt-5 self-start">Practise <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}
