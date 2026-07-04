import { NextResponse } from 'next/server';
import { createClaudeText, isAiConfigured, CLAUDE_MODEL } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';

/** Lightweight deploy check — confirms AI env vars without exposing secrets. */
export async function GET(request) {
  const aiConfigured = isAiConfigured();
  const payload = {
    ok: true,
    aiConfigured,
    model: CLAUDE_MODEL,
    nodeEnv: process.env.NODE_ENV || 'unknown',
  };

  const url = new URL(request.url);
  if (url.searchParams.get('ai') !== '1' || !aiConfigured) {
    return NextResponse.json(payload);
  }

  try {
    const reply = await createClaudeText({
      system: 'Reply with exactly: ok',
      user: 'ping',
      maxTokens: 16,
    });

    return NextResponse.json({
      ...payload,
      aiPing: reply?.toLowerCase().includes('ok') ? 'pass' : 'unexpected',
      aiPingSample: reply?.slice(0, 80) || '',
    });
  } catch (err) {
    console.error('HEALTH AI PING ERROR:', err?.status, err?.message || err);
    return NextResponse.json({
      ...payload,
      aiPing: 'fail',
      aiError: err?.status || err?.message || 'unknown',
    });
  }
}
