import { Children, isValidElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * The resume format (the candidate's own sample CV): centred capitalised name, centred contact line,
 * bold capital section headings with a black rule, "Company || Location" and "Role || Dates" rows
 * split left/right, "•" bullets with key numbers in bold.
 * One source for the screen, the page check and the PDF download, so all three always match.
 */
export const LAYOUT = { w: 8.27, h: 11.69, margin: 0.5 }; // A4, inches
export const CONTENT_W = LAYOUT.w - 2 * LAYOUT.margin;
/** Printable height of one page, px. */
export const PAGE_ROOM = (LAYOUT.h - 2 * LAYOUT.margin) * 96;
/** One line of body text, px (11pt x 1.2). */
export const LINE_PX = 10 * 1.25 * (96 / 72);

/**
 * CSS for the resume, scoped under `s` ("body" for print, ".a4-sheet" on screen).
 * Type follows common IIM placement-CV practice: Arial (installed everywhere, ATS-safe), 10pt body,
 * 16pt name, 10.5pt bold capital headings with a rule, dates right-aligned and upright (no italics).
 */
export function resumeCss(s: string, screen = false) {
  const i = screen ? " !important" : ""; // on screen, beat the app's own heading font
  const f = `Arial,Helvetica,sans-serif${i}`;
  return `
${s}{font-family:${f};font-size:10pt;line-height:1.25;color:#000}
${s} h1,${s} h2,${s} h3{font-family:${f};color:#000${i};letter-spacing:normal${i};line-height:1.25${i}}
${s} h1{font-size:16pt;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.03em${i};margin:0}
${s} h1+p{text-align:center;font-size:9.5pt;margin:2pt 0 2pt}
${s} h2{font-size:10.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em${i};border-bottom:1px solid #000;padding-bottom:1.5pt;margin:8pt 0 3pt}
${s} h3{font-size:10pt;font-weight:700;margin:4pt 0 0}
${s} p{margin:0}${s} ul{list-style:disc;margin:1pt 0 0;padding-left:14pt}${s} li{margin:0 0 1pt}
${s} strong{font-weight:700}${s} em{font-style:normal}
${s} .rl{display:flex;justify-content:space-between;align-items:baseline;gap:12pt}
${s} .rl>span:last-child{text-align:right;white-space:nowrap;flex-shrink:0}
${s} a{color:#1f4e79;text-decoration:none}
${s} h1+p a{color:inherit${i};text-decoration:none${i}}`;
}

const DATES = /((19|20)\d{2}|present)/i;

/** Split a row's children at " || " into left and right parts (null if there's no split). */
function splitRow(children: React.ReactNode): [React.ReactNode[], React.ReactNode[]] | null {
  const parts = Children.toArray(children);
  const at = parts.findIndex((c) => typeof c === "string" && c.includes("||"));
  if (at >= 0) {
    const [a, b] = (parts[at] as string).split(/\s*\|\|\s*/, 2);
    // the company line (###) shows its location in bold, like the sample CV - handled by h3 being bold
    return [[...parts.slice(0, at), a].filter((x) => x !== ""), [b, ...parts.slice(at + 1)].filter((x) => x !== "")];
  }
  // Older resumes: "**Left** | short right part" -> same left/right row
  if (parts.length === 2 && isValidElement(parts[0]) && parts[0].type === "strong" && typeof parts[1] === "string") {
    const m = /^\s*\|\s*(.+)$/.exec(parts[1]);
    if (m && m[1].length <= 40 && !m[1].includes("|")) return [[parts[0]], [DATES.test(m[1]) ? m[1] : <strong key="l">{m[1]}</strong>]];
  }
  return null;
}

function Row({ as: Tag, children }: { as: "p" | "h3"; children: React.ReactNode }) {
  const split = splitRow(children);
  if (!split) return <Tag>{children}</Tag>;
  return (
    <Tag className="rl">
      <span>{split[0]}</span>
      <span>{split[1]}</span>
    </Tag>
  );
}

const components: Components = {
  p: ({ children }) => <Row as="p">{children}</Row>,
  h3: ({ children }) => <Row as="h3">{children}</Row>,
};

export function ResumeMarkdown({ md }: { md: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {md}
    </ReactMarkdown>
  );
}
