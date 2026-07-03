import { getUserFacingAiError } from '@/lib/anthropic';

const FREE_LIMIT_MESSAGE =
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
  if (typeof json?.error === 'string' && json.error) return json.error;

  if (res.status === 401) {
    return 'Your session expired. Please log in again and retry.';
  }

  if (res.status === 403) {
    return FREE_LIMIT_MESSAGE;
  }

  if (res.status >= 500) {
    return getUserFacingAiError();
  }

  const trimmed = text?.trim();
  if (trimmed && trimmed.length < 240 && !trimmed.startsWith('<')) {
    return trimmed;
  }

  return getUserFacingAiError();
}

export { FREE_LIMIT_MESSAGE };
