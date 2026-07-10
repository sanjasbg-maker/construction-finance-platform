import Anthropic from "@anthropic-ai/sdk";

/**
 * Lazily constructs the Anthropic client so a missing ANTHROPIC_API_KEY only
 * fails the specific action that needs it, not module import / build time.
 * Server-only — never import this from a Client Component.
 */
export function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  return new Anthropic();
}
