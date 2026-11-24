import Link from "next/link";
import { CompanyWordmark } from "./CompanyWordmark";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { buildPrompt, type NegotiationInputs, type StepKey } from "@/lib/prompts";
import type { Application, Message, Session } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { cleanAi } from "@/lib/clean-ai";
import { RealtimeCall } from "./RealtimeCall";
import { VoiceLoop } from "./VoiceLoop";
import { RoundMenu, RoundStage } from "./RoundStage";
import { ReviewTranscript } from "./ReviewTranscript";
import { getSettings, personalSettings } from "@/lib/ai";
import { PROVIDERS, providerOf } from "@/lib/models";
import { createServiceClient } from "@/lib/supabase/server";
import { InterviewScorecard, OfferCheckCard, PracticeModes } from "./PracticeInsights";
import type { InterviewReport, OfferCheck } from "@/lib/tasks";
import { deleteSession } from "@/lib/actions";
import { timeAgo } from "./ui";

const CONFIG = {
  interview: { step: "mock_interview" as StepKey, back: "/interview", backLabel: "Interview", tag: "Mock interview", quick: ["Ready"], ai: "Interviewer" },
  negotiation: { step: "negotiation" as StepKey, back: "/negotiation", backLabel: "Salary", tag: "Salary talk", quick: ["Stop and give feedback"], ai: "HR" },
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
  // Voice follows the person's AI: ChatGPT talks live; Claude replies after a short pause.
  const svc = createServiceClient();
  const mine = await personalSettings(svc, profile.id, await getSettings(svc));
  const brand = PROVIDERS[providerOf(mine.model)].short;
  const cfg = CONFIG[kind];
  const prompt = buildPrompt(cfg.step, {
    profile,
    app,
    negotiation: kind === "negotiation" ? (session.meta as unknown as NegotiationInputs) : undefined,
  });
  const del = deleteSession.bind(null, id, cfg.back);
  const visible = (messages ?? []).filter((m) => !(m.role === "user" && m.step && m.step !== "voice"));
  const voiceTurns = visible.filter((m) => m.step === "voice"); // each mode shows only its own conversation
  const answers = visible.filter((m) => m.role === "user" && m.content.trim().toLowerCase() !== "ready").length;
  const meta = session.meta as unknown as Record<string, unknown>;
  const report = (meta.interview_report as InterviewReport | undefined) ?? null;
  const transcriptLen = visible.map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`).join("\n").length;
  const stale = !!report && transcriptLen > Number(meta.report_turns ?? 0) + 40;
  // Has this round already ended? ([[END]] is the hidden end tag.) Then voice offers a new round instead.
  const assistantText = (messages ?? []).filter((m) => m.role === "assistant").map((m) => m.content);
  const finished = assistantText.some((t) => /\[\[END\]\]/.test(t));
  const asked = Math.max(0, ...assistantText.flatMap((t) => [...t.matchAll(/\[\[Q(\d)\]\]/g)].map((x) => Number(x[1]))));
  // Which round of this job is this? (Same job, or same custom role when there's no job.)
  let rq = supabase.from("sessions").select("id").eq("kind", kind).order("created_at", { ascending: true });
  rq = session.application_id ? rq.eq("application_id", session.application_id) : rq.is("application_id", null).eq("title", session.title);
  const { data: siblings } = await rq;
  const roundNo = Math.max(1, (siblings ?? []).findIndex((r) => r.id === id) + 1);
  const hubHref = `${cfg.back}${session.application_id ? `?app=${session.application_id}` : ""}`;
  const role = app?.role ?? (meta.role as string | undefined) ?? session.title;
  const voiceReady = profile.voice_enabled && profile.ai_mode === "real" && profile.is_active;
  const company = app?.company ?? (meta.company as string | undefined);

  const unit = kind === "interview" ? "Round" : "Talk";
  return (
    <div className="space-y-5">
      {/* Slim header: where you are, which attempt, and its state. Rare actions live in the ⋯ menu. */}
      <header className="card flex flex-wrap items-center gap-3 px-4 py-3.5 fade-up sm:px-5">
        <Link href={hubHref} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-line-2 hover:text-ink" aria-label={`Back to ${cfg.backLabel}`} data-tip={`All ${unit.toLowerCase()}s`}><ChevronLeft size={20} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 text-[0.82rem] text-muted">{company && <CompanyWordmark name={company} height={20} iconSize={24} nameClass="truncate text-[0.86rem] font-bold text-ink" />}<span className="shrink-0">· {cfg.tag}</span></div>
          <h1 className="truncate text-[1.35rem] font-bold leading-tight sm:text-[1.55rem]">{role}</h1>
        </div>
        <div className="order-last flex w-full items-center gap-2 pl-[6.4rem] sm:order-none sm:w-auto sm:pl-0">
          <span className="chip bg-line-2 font-semibold text-ink">{unit} {roundNo}</span>
          <span className={`chip font-semibold ${finished ? "bg-good-soft text-good" : "bg-brand-soft text-brand"}`}>{finished ? "Complete" : "In progress"}</span>
          <span className="hidden text-[0.8rem] text-muted md:inline">{timeAgo(session.created_at)}</span>
        </div>
        <RoundMenu onDelete={del} kind={kind} />
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="practice-col min-w-0 fade-up">
          <RoundStage sessionId={id} kind={kind} finished={finished} roundNo={roundNo} hubHref={hubHref} review={<ReviewTranscript messages={messages ?? []} aiName={cfg.ai} />}>
          <PracticeModes
            available={voiceReady}
            voiceLabel={`${brand} voice`}
            realistic={
              providerOf(mine.model) === "anthropic" ? (
                <VoiceLoop sessionId={id} aiName={cfg.ai} kind={kind} modelName={brand} asked={asked} history={voiceTurns.map((m) => ({ role: m.role, content: cleanAi(m.content) }))} kickoff={(messages ?? []).length === 0 ? { prompt, step: cfg.step } : null} />
              ) : (
                <RealtimeCall sessionId={id} aiName={cfg.ai} kind={kind} history={voiceTurns.map((m) => ({ role: m.role, content: cleanAi(m.content) }))} />
              )
            }
            classic={
              <div data-chat-scroll className="card thin-scroll h-[70vh] min-h-[460px] overflow-y-auto px-4 pt-4 sm:px-5 xl:h-full xl:min-h-0" style={{ "--chat-bg": "var(--card)" } as React.CSSProperties}>
              <ChatPanel
                sessionId={id}
                initialMessages={messages ?? []}
                voice
                aiName={cfg.ai}
                quickReplies={cfg.quick}
                autoStart={{ prompt, step: cfg.step }}
                placeholder="Or type your answer..."
                finished={finished}
              />
              </div>
            }
          />
          </RoundStage>
        </div>
        <aside className="practice-col practice-aside flex flex-col gap-4 fade-up xl:sticky xl:top-6">
          {kind === "negotiation" && <OfferCheckCard sessionId={id} initial={(meta.offer_check as OfferCheck | undefined) ?? null} />}
          {kind === "interview" && <InterviewScorecard sessionId={id} initial={report} answers={answers} stale={stale} />}
        </aside>
      </div>
    </div>
  );
}
