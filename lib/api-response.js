import { getUserFacingAiError } from '@/lib/anthropic';

export const FREE_LIMIT_MESSAGE =
  'You have used all 5 free resume/cover letter generations this month. Upgrade to Pro for CAD $9.99/month to continue.';

export async function readApiJson(res) {
  const text = await res.text();
  if (!text) return { json: null, text: '' };

  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

export function getApiErrorMessage(res, json, text) {
  if (json?.error === 'FREE_LIMIT_REACHED') return FREE_LIMIT_MESSAGE;
  if (typeof json?.message === 'string' && json.message) return json.message;
  if (typeof json?.error === 'string' && json.error) return json.error;

  if (res.status === 401) {
    return 'Your session expired. Please log in again and retry.';
  }

  if (res.status === 429) {
    return FREE_LIMIT_MESSAGE;
  }

  if (res.status >= 500) {
    return getUserFacingAiError();
  }

  // Plain-text 403/502/etc. from nginx/WAF — not a usage-limit response.
  if (res.status === 403 || res.status === 502 || res.status === 503) {
    return getUserFacingAiError();
  }

  const trimmed = text?.trim();
  if (trimmed && trimmed.length < 240 && !trimmed.startsWith('<')) {
    return getUserFacingAiError();
  }

  return getUserFacingAiError();
}

/** Strip HTML and cap length so large job posts are less likely to trip WAF rules. */
export function sanitizeJobDescription(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}
