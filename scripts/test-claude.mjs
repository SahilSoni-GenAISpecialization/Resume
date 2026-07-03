/**
 * Quick smoke test for Claude API wiring.
 * Usage: node scripts/test-claude.mjs
 * Requires ANTHROPIC_API_KEY in .env.local or environment.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('Missing ANTHROPIC_API_KEY. Add it to .env.local or your shell environment.');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const message = await client.messages.create({
  model,
  max_tokens: 256,
  system: 'Return ONLY valid JSON with keys "ok" (boolean) and "model" (string). No markdown.',
  messages: [{ role: 'user', content: 'Reply with ok:true and the model name you are running.' }],
});

const text = message.content
  .filter((b) => b.type === 'text')
  .map((b) => b.text)
  .join('')
  .trim();

console.log('Model:', model);
console.log('Response:', text);

try {
  const parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, ''));
  if (parsed.ok) {
    console.log('Claude API test passed.');
    process.exit(0);
  }
} catch {
  /* fall through */
}

console.error('Unexpected response format.');
process.exit(1);
