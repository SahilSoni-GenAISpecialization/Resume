import { NextResponse } from 'next/server';
import { isAiConfigured, CLAUDE_MODEL } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';

/** Lightweight deploy check — confirms AI env vars without exposing secrets or burning tokens. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    aiConfigured: isAiConfigured(),
    model: CLAUDE_MODEL,
    nodeEnv: process.env.NODE_ENV || 'unknown',
  });
}
