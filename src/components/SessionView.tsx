import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { requireUser } from "@/lib/auth";
import { buildPrompt, type NegotiationInputs, type StepKey } from "@/lib/prompts";
import type { Application, Message, Session } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { RealtimeCall } from "./RealtimeCall";
import { InterviewScorecard, OfferCheckCard, PracticeModes } from "./PracticeInsights";
import type { InterviewReport, OfferCheck } from "@/lib/tasks";
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
  const visible = (messages ?? []).filter((m) => !(m.role === "user" && m.step));
  const answers = visible.filter((m) => m.role === "user" && m.content.trim().toLowerCase() !== "ready").length;
  const meta = session.meta as unknown as Record<string, unknown>;
  const report = (meta.interview_report as InterviewReport | undefined) ?? null;
  const transcriptLen = visible.map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`).join("\n").length;
  const stale = !!report && transcriptLen > Number(meta.report_turns ?? 0) + 40;
  const voiceReady = profile.voice_enabled && profile.ai_mode === "real" && profile.is_active;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <Link href={cfg.back} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> {cfg.backLabel}</Link>
        <DeleteSessionButton action={del} />
      </div>
      <h1 className="mb-5 text-xl font-bold tracking-tight">{session.title}</h1>
      {kind === "negotiation" && <OfferCheckCard sessionId={id} initial={(meta.offer_check as OfferCheck | undefined) ?? null} />}
      {kind === "interview" && <InterviewScorecard sessionId={id} initial={report} answers={answers} stale={stale} />}
      <PracticeModes
        available={voiceReady}
        realistic={<RealtimeCall sessionId={id} aiName={cfg.ai} kind={kind} history={visible.map((m) => ({ role: m.role, content: m.content }))} />}
        classic={
          <ChatPanel
            sessionId={id}
            initialMessages={messages ?? []}
            voice
            aiName={cfg.ai}
            quickReplies={cfg.quick}
            autoStart={{ prompt, step: cfg.step }}
            placeholder="Or type your answer…"
          />
        }
      />
    </div>
  );
}
