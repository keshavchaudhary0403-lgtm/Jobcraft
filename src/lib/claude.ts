import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let _client: Anthropic | null = null;
export function claude() {
  if (!_client) _client = new Anthropic();
  return _client;
}
