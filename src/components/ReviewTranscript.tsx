import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mic, MessageSquareText } from "lucide-react";
import { cleanAi } from "@/lib/clean-ai";
import type { Message } from "@/lib/types";

/** Read-only transcript of a finished round: voice and chat turns together, in order. */
export function ReviewTranscript({ messages, aiName }: { messages: Message[]; aiName: string }) {
  const turns = messages.filter((m) => !(m.role === "user" && m.step && m.step !== "voice") && m.content.trim());
  return (
    <div className="card thin-scroll h-[70vh] min-h-[420px] overflow-y-auto p-5 xl:h-full xl:min-h-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">Transcript</div>
        <div className="text-[0.8rem] text-muted">{turns.filter((t) => t.role === "user").length} answers</div>
      </div>
      <div className="flex flex-col gap-3">
        {turns.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-[18px] rounded-br-md bg-side px-4 py-2.5 text-[0.92rem] text-cream">{m.content}</div>
            </div>
          ) : (
            <div key={m.id} className="max-w-[92%]">
              <div className="mb-1 flex items-center gap-1.5 text-[0.8rem] font-semibold text-faint">
                {aiName}
                {m.step === "voice" ? <Mic size={11} aria-label="said on a voice call" /> : <MessageSquareText size={11} aria-label="in chat" />}
              </div>
              <div className="prose-ai rounded-[18px] rounded-tl-md px-4 py-3 text-[0.95rem] leading-relaxed" style={{ background: "var(--color-cream)" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanAi(m.content)}</ReactMarkdown>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
