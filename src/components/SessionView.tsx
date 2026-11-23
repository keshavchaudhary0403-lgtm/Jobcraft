import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { buildPrompt, type NegotiationInputs, type StepKey } from "@/lib/prompts";
import type { Application, Message, Session } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { deleteSession } from "@/lib/actions";

const CONFIG = {
  interview: { step: "mock_interview" as StepKey, back: "/interview", backLabel: "Interview practice", quick: ["Ready"], ai: "Interviewer" },
  negotiation: { step: "negotiation" as StepKey, back: "/negotiation", backLabel: "Salary negotiation", quick: ["Stop and give feedback"], ai: "HR" },
};

export async function SessionView({ id, kind }: { id: string; kind: keyof typeof CONFIG }) {
  const { supabase, profile } = await requireUser();
  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).eq("kind", kind).single<Session>();
  if (!session) notFound();

  let app: Application | null = null;
  if (session.application_id) {
    const { data } = await supabase.from("applications").select("*").eq("id", session.application_id).single<Application>();
    app = data;
  } else if (session.meta.company || session.meta.role) {
    app = { company: session.meta.company, role: session.meta.role } as Application;
  }

  const { data: messages } = await supabase.from("messages").select("*").eq("session_id", id).order("created_at").returns<Message[]>();
  const cfg = CONFIG[kind];
  const prompt = buildPrompt(cfg.step, {
    profile,
    app,
    negotiation: kind === "negotiation" ? (session.meta as unknown as NegotiationInputs) : undefined,
  });
  const del = deleteSession.bind(null, id, cfg.back);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <Link href={cfg.back} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> {cfg.backLabel}</Link>
        <form action={del}>
          <button className="btn-quiet rounded-lg" title="Delete session" aria-label="Delete session"><Trash2 size={15} /></button>
        </form>
      </div>
      <h1 className="mb-5 text-xl font-semibold tracking-tight">{session.title}</h1>
      <ChatPanel
        sessionId={id}
        initialMessages={messages ?? []}
        voice
        aiName={cfg.ai}
        quickReplies={cfg.quick}
        autoStart={{ prompt, step: cfg.step }}
        placeholder="Or type your answer…"
      />
    </div>
  );
}
