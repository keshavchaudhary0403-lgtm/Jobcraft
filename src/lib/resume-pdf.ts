import { LAYOUT, resumeCss } from "@/components/ResumeDoc";

/**
 * The resume as a printable A4 HTML document (same type and margins as the on-screen page check).
 * Page margin is 0 so no browser header/footer can ever appear; the 0.5in margins come from a table
 * whose header/footer rows repeat on every page.
 */
export function pdfHtml(title: string, body: string, extraCss = "") {
  const m = `${LAYOUT.margin}in`;
  const esc = (t: string) => t.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
${extraCss}
${resumeCss("body")}
@page{size:A4;margin:0}
html,body{margin:0}
body{padding:0 ${m}}
table.pg{width:100%;border-collapse:collapse}
table.pg td{padding:0;vertical-align:top}
.pg-gap{height:${m}}
</style></head><body><table class="pg"><thead><tr><td class="pg-gap"></td></tr></thead><tfoot><tr><td class="pg-gap"></td></tr></tfoot><tbody><tr><td>${body}</td></tr></tbody></table></body></html>`;
}

/** "<Name>_Resume_<Company>" - ASCII only, safe as a file name. */
export function resumeFileName(md: string, company: string) {
  const name = (md.match(/^#\s+(.+)$/m)?.[1] ?? "Resume").trim();
  return `${name}_Resume_${company}`.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Resume";
}
