/**
 * Shows a job description saved as plain text (from LinkedIn, Naukri, a paste...) the way job boards show it:
 * section headings in bold, groups of lines as bullet lists, and "Label: detail" lines with the label in bold.
 * It only reads the text's shape (short lines, blank lines, bullets), so it works for every saved job, old or new.
 */

type Block = { kind: "h"; text: string } | { kind: "p"; text: string } | { kind: "ul"; items: string[] } | { kind: "ol"; items: string[] };

const BULLET = /^\s*(?:[•●▪◦‣∙·*\-–—]|•)\s+/;
const NUMBER = /^\s*(?:\d{1,2}|[a-z])[.)]\s+/i;
const HEAD_WORDS = /\b(responsibilit|requirement|qualification|about|skills?|benefits?|perks|what you|who you|you will|you'll|we offer|we're looking|why join|role|job description|key |must have|nice to have|good to have|preferred|experience|education|eligibility|candidate|profile|overview|summary|duties|compensation|salary|location|the opportunity|the team|what we|how to apply|desired|competenc|mandatory|additional|other details|purpose|mission|scope|deliverables|accountabilit)/i;

function isHeading(line: string, nextBlank: boolean, next = ""): boolean {
  const t = line.trim();
  if (!t || t.length > 70 || BULLET.test(t) || NUMBER.test(t)) return false;
  if (/^#{1,4}\s/.test(t) || /^\*\*[^*]+\*\*:?$/.test(t)) return true;
  if (/[.,;!?]$/.test(t)) return false;
  if (/:\s+\S/.test(t)) return false; // "Role: Operations Manager" is a detail line, not a heading
  const words = t.split(/\s+/).length;
  if (words > 9) return false;
  if (t.endsWith(":")) return true;
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) return true;
  if (HEAD_WORDS.test(t) && (nextBlank || words <= 6)) return true;
  // A short Title-like line ("Job Purpose") right before a long line of text is a heading too.
  return words <= 4 && /^[A-Z]/.test(t) && next.trim().length > 60;
}

const strip = (s: string) => s.replace(/^[\s\-=_*~#]{2,}|[\s\-=_*~]{2,}$/g, "").replace(/^#{1,4}\s+/, "").replace(/^\*\*|\*\*$|\*\*(?=:$)/g, "").replace(/:$/, "").trim();

export function parseJd(raw: string): Block[] {
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, ""));
  const blocks: Block[] = [];
  let group: string[] = [];

  const flush = () => {
    if (!group.length) return;
    const g = group;
    group = [];
    // Long unmarked lines are prose paragraphs; runs of shorter (or bulleted) lines are lists.
    let run: string[] = [];
    const endRun = () => {
      if (!run.length) return;
      if (run.every((l) => NUMBER.test(l))) blocks.push({ kind: "ol", items: run.map((l) => l.replace(NUMBER, "")) });
      else if (run.length > 1 || BULLET.test(run[0])) blocks.push({ kind: "ul", items: run.map((l) => l.replace(BULLET, "")) });
      else blocks.push({ kind: "p", text: run[0] });
      run = [];
    };
    for (const l of g) {
      if (l.length > 240 && !BULLET.test(l) && !NUMBER.test(l)) { endRun(); blocks.push({ kind: "p", text: l }); }
      else run.push(l);
    }
    endRun();
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) return flush();
    const nextBlank = i + 1 >= lines.length || !lines[i + 1].trim();
    if (isHeading(t, nextBlank, lines[i + 1] ?? "")) {
      flush();
      blocks.push({ kind: "h", text: strip(t) });
      return;
    }
    group.push(t);
  });
  flush();

  // "Label: detail" items separated by blank lines are still one list: merge them (and lists right next to them).
  const out: Block[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    const item = b.kind === "p" && LABELLED(b.text) ? [b.text] : b.kind === "ul" ? b.items : null;
    const prevItems = prev && (prev.kind === "ul" ? prev.items : prev.kind === "p" && LABELLED(prev.text) ? [prev.text] : null);
    if (item && prevItems && (b.kind === "p" || prev.kind === "p" || [...item, ...prevItems].every(LABELLED))) out[out.length - 1] = { kind: "ul", items: [...prevItems, ...item] };
    else out.push(b);
  }
  return out;
}

const LABEL = /^([^:]{2,48}):\s+(.+)$/;
const LABELLED = (t: string) => { const m = t.match(LABEL); return !!m && m[1].split(/\s+/).length <= 7 && !/https?$/i.test(m[1]); };

/** "Ground metrics ownership: Act as..." → bold label + text. */
function Rich({ text }: { text: string }) {
  const m = text.match(LABEL);
  if (m && LABELLED(text)) {
    return <><strong className="font-semibold text-ink">{m[1].replace(/^\*\*|\*\*$/g, "")}:</strong> {m[2]}</>;
  }
  return <>{text.replace(/\*\*/g, "")}</>;
}

export function JdText({ text }: { text: string }) {
  const blocks = parseJd(text);
  return (
    <div className="space-y-3 leading-relaxed text-slate-700">
      {blocks.map((b, i) => {
        if (b.kind === "h") return <h3 key={i} className={`font-display text-[1.02rem] font-bold text-ink ${i ? "pt-2" : ""}`}>{b.text}</h3>;
        if (b.kind === "p") return <p key={i}><Rich text={b.text} /></p>;
        const List = b.kind === "ol" ? "ol" : "ul";
        return (
          <List key={i} className={`space-y-1.5 pl-5 ${b.kind === "ol" ? "list-decimal" : "list-disc"} marker:text-faint`}>
            {b.items.map((it, j) => <li key={j} className="pl-1"><Rich text={it} /></li>)}
          </List>
        );
      })}
    </div>
  );
}
