import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { buildPrompt, STEP_META, type NegotiationInputs, type StepKey } from "@/lib/prompts";
import type { Application, Message, Session, SessionKind } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { deleteSession } from "@/lib/actions";

const CONFIG: Record<Exclude<SessionKind, "workspace">, { step: StepKey; back: string; backLabel: string; quick: string[]; voice: boolean }> = {
  interview: { step: "mock_interview", back: "/interview", backLabel: "Interview practice", quick: ["ready"], voice: true },
  negotiation: { step: "negotiation", back: "/negotiation", backLabel: "Negotiation", quick: ["stop"], voice: true },
  linkedin: { step: "linkedin", back: "/linkedin", backLabel: "LinkedIn", quick: [], voice: false },
};

export async function SessionView({ id, kind }: { id: string; kind: Exclude<SessionKind, "workspace"> }) {
  const { supabase, profile } = await requireUser();
  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).eq("kind", kind).single<Session>();
  if (!session) notFound();

  let app: Application | null = null;
  if (session.application_id) {
    const { data } = await supabase.from("applications").select("*").eq("id", session.application_id).single<Application>();
    app = data;
  } else if (kind !== "linkedin" && (session.meta.company || session.meta.role)) {
    app = { company: session.meta.company, role: session.meta.role } as Application;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const cfg = CONFIG[kind];
  const meta = STEP_META[cfg.step];
  const prompt = buildPrompt(cfg.step, {
    profile: kind === "linkedin" && session.meta.role ? { ...profile, target_role: session.meta.role } : profile,
    app,
    negotiation: kind === "negotiation" ? (session.meta as unknown as NegotiationInputs) : undefined,
  });
  const del = deleteSession.bind(null, id, cfg.back);

  return (
    <>
      <Link href={cfg.back} className="text-sm text-muted hover:text-ink">← {cfg.backLabel}</Link>
      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Prompt {meta.n} · {meta.title}</div>
          <h1 className="font-serif text-3xl leading-tight">{session.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{meta.when}</p>
        </div>
        <form action={del}>
          <button className="text-xs text-muted hover:text-warm">Delete session</button>
        </form>
      </div>
      {kind === "interview" && (
        <div className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          Tip: tap <strong>Speak</strong>, answer out loud like the real thing, then tap <strong>Send</strong>. Say “ready” to begin.
        </div>
      )}
      {kind === "negotiation" && (
        <div className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          First you&apos;ll get a market check. Then make your counter by voice — HR will push back. Say “stop” to end and get feedback.
        </div>
      )}
      <ChatPanel
        sessionId={id}
        initialMessages={messages ?? []}
        voice={cfg.voice}
        quickReplies={cfg.quick}
        autoStart={{ prompt, step: cfg.step }}
        placeholder={cfg.voice ? "Type your answer, or tap Speak…" : undefined}
      />
    </>
  );
}
