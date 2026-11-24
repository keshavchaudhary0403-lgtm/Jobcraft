/** Hidden control tags the AI uses ([[Q3]], [[END]]) never reach the screen, voice or clipboard.
 *  Older rounds that said "Question 2 of 6:" out loud are tidied the same way. */
export const cleanAi = (t: string) =>
  t
    .replace(/\s*\[\[(?:Q\d+|END)\]\]\s*/g, (m) => (/\n/.test(m) ? "\n" : " "))
    .replace(/(^|\n)\s*Question\s+\d+\s+of\s+6:\s*/gi, "$1")
    .replace(/^\s+/, "");
