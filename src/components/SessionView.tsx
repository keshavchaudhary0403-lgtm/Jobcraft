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
  // The next round is always after the LAST one for this job (not after the one being viewed).
  const nextNo = Math.max(roundNo, (siblings ?? []).length) + 1;
  // One rule everywhere (same as the rounds list): a round is complete once it has a score, or the interviewer ended it.
  const done = finished || (kind === "interview" && typeof report?.score === "number");
  // Open the tab where this round's conversation actually happened.
  const chatTurns = visible.filter((m) => m.step !== "voice").length;
  const startMode = voiceTurns.length === 0 && chatTurns > 0 ? "classic" : "realistic";
  const hubHref = `${cfg.back}${session.application_id ? `?app=${session.application_id}` : ""}`;
  const role = app?.role ?? (meta.role as string | undefined) ?? session.title;
  const voiceReady = profile.voice_enabled && profile.ai_mode === "real" && profile.is_active;
  const company = app?.company ?? (meta.company as string | undefined);

  const unit = kind === "interview" ? "Round" : "Talk";
  return (
    <div className="space-y-5">
      {/* Slim header: where you are, which attempt, and its state. Rare actions live in the ⋯ menu. */}
      <header className="card flex flex-wrap items-center gap-3 p-3 fade-up sm:p-4">
        <Link href={hubHref} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-line-2 hover:text-ink" aria-label={`Back to ${cfg.backLabel}`} data-tip={`All ${unit.toLowerCase()}s`}><ChevronLeft size={20} /></Link>
        {/* Same highlighted block as the practice hub: logo | divider | what this is + the role. */}
        <div className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl bg-brand-soft/60 px-4 py-3 ring-1 ring-inset ring-brand/10">
          {company && (
            <>
              <span className="hidden w-[260px] shrink-0 sm:block">
                <CompanyWordmark name={company} jobUrl={app?.job_url} domain={app?.company_domain} logo={app?.company_logo} height={32} iconSize={34} nameClass="truncate text-[0.9rem] font-bold text-ink" />
              </span>
              <span aria-hidden className="hidden h-11 w-px shrink-0 bg-brand/20 sm:block" />
            </>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-brand">{cfg.tag} · {unit} {roundNo}</div>
            <h1 className="mt-0.5 truncate text-[1.3rem] font-bold leading-tight sm:text-[1.45rem]" title={role ?? undefined}>{role}</h1>
            {company && <p className="truncate text-[0.86rem] font-semibold text-ink sm:hidden">{company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip font-semibold ${done ? "bg-good-soft text-good" : "bg-brand-soft text-brand"}`}>{done ? "Complete" : "In progress"}</span>
          <span className="hidden text-[0.8rem] text-muted md:inline">{timeAgo(session.created_at)}</span>
          <RoundMenu onDelete={del} kind={kind} />
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="practice-col min-w-0 fade-up">
          <RoundStage sessionId={id} kind={kind} finished={done} roundNo={roundNo} nextNo={nextNo} hubHref={hubHref} review={<ReviewTranscript messages={messages ?? []} aiName={cfg.ai} />}>
          <PracticeModes
            available={voiceReady}
            initial={startMode}
            voiceLabel={`${brand} voice`}
            realistic={
              providerOf(mine.model) === "anthropic" ? (
                <VoiceLoop sessionId={id} aiName={cfg.ai} kind={kind} modelName={brand} asked={asked} history={voiceTurns.map((m) => ({ role: m.role, content: cleanAi(m.content) }))} kickoff={(messages ?? []).length === 0 ? { prompt, step: cfg.step } : null} />
              ) : (
                <RealtimeCall sessionId={id} aiName={cfg.ai} kind={kind} history={voiceTurns.map((m) => ({ role: m.role, content: cleanAi(m.content) }))} />
              )
            }
            classic={
              <div className="flex h-[78vh] min-h-[520px] flex-col xl:h-full xl:min-h-0">
              <ChatPanel
                sessionId={id}
                initialMessages={messages ?? []}
                voice
                aiName={cfg.ai}
                quickReplies={cfg.quick}
                autoStart={{
                  prompt,
                  step: cfg.step,
                  hint: kind === "interview" ? "The hiring manager asks one question at a time. Type your answers, or tap the mic to say them." : "HR makes the offer and pushes back. Type your replies, or tap the mic to say them.",
                }}
                placeholder="Or type your answer..."
                finished={done}
                practice={{ modeLabel: "Chat + basic voice", questionBars: kind === "interview" }}
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
