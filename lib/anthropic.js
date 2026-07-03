import Anthropic from '@anthropic-ai/sdk';

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

let anthropicClient = null;

export function getAnthropic() {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export function extractTextFromMessage(message) {
  return (message?.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

function stripJsonFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function createClaudeText({ system, user, maxTokens = 4096 }) {
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return extractTextFromMessage(message);
}

export async function createClaudeJson({ system, user, maxTokens = 8192 }) {
  const raw = await createClaudeText({ system, user, maxTokens });
  if (!raw) {
    throw new Error('AI returned an empty response.');
  }

  try {
    return JSON.parse(stripJsonFences(raw));
  } catch {
    throw new Error('AI returned invalid JSON.');
  }
}
