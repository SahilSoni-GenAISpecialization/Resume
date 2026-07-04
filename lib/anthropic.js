import Anthropic from '@anthropic-ai/sdk';

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const MODEL_FALLBACKS = [
  CLAUDE_MODEL,
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
];

export const AI_USER_ERROR =
  'Internal error. Our engineers are working to get it fixed. Please try again later.';

let anthropicClient = null;

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function getUserFacingAiError() {
  return AI_USER_ERROR;
}

export function getAnthropic() {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('Anthropic API key is not configured');
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

function isMissingModelError(err) {
  const msg = String(err?.message || '');
  return err?.status === 404 || msg.includes('not_found') || msg.includes('model:');
}

function isRetryableError(err) {
  const status = err?.status;
  if (status === 429 || status === 529 || status === 503 || status === 502 || status === 500) return true;
  const type = err?.error?.type || err?.type;
  if (type === 'overloaded_error' || type === 'rate_limit_error') return true;
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('overloaded') || msg.includes('rate limit') || msg.includes('timeout');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createMessageWithFallback(params) {
  const anthropic = getAnthropic();
  const tried = new Set();
  let lastError = null;

  for (const model of MODEL_FALLBACKS) {
    if (tried.has(model)) continue;
    tried.add(model);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await anthropic.messages.create({ ...params, model });
      } catch (err) {
        lastError = err;
        console.error(
          'Claude API error:',
          model,
          'attempt',
          attempt + 1,
          err?.status,
          err?.error?.type || err?.type,
          err?.message || err
        );

        if (isMissingModelError(err)) break;

        if (isRetryableError(err) && attempt < 2) {
          await wait(800 * (attempt + 1));
          continue;
        }

        throw err;
      }
    }
  }

  throw lastError || new Error('No Claude model available');
}

export async function createClaudeText({ system, user, maxTokens = 4096 }) {
  const message = await createMessageWithFallback({
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return extractTextFromMessage(message);
}

export async function createClaudeJson({ system, user, maxTokens = 4096 }) {
  const raw = await createClaudeText({ system, user, maxTokens });
  if (!raw) {
    throw new Error('AI returned an empty response');
  }

  try {
    return JSON.parse(stripJsonFences(raw));
  } catch {
    const repaired = await createClaudeText({
      system: 'Return ONLY valid JSON. Fix syntax issues. No markdown fences or commentary.',
      user: raw.slice(0, 12000),
      maxTokens: Math.min(maxTokens, 8192),
    });
    try {
      return JSON.parse(stripJsonFences(repaired));
    } catch {
      throw new Error('AI returned invalid JSON');
    }
  }
}
