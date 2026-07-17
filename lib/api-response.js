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
    if (typeof json?.error === 'string' && json.error) return json.error;
    return getUserFacingAiError();
  }

  // Plain-text 403/502/etc. from nginx/WAF — not a usage-limit response.
  if (res.status === 403 || res.status === 502 || res.status === 503) {
    if (typeof json?.error === 'string' && json.error) return json.error;
    return getUserFacingAiError();
  }

  const trimmed = text?.trim();
  if (trimmed && trimmed.length < 240 && !trimmed.startsWith('<')) {
    return getUserFacingAiError();
  }

  return getUserFacingAiError();
}

/** Client-side POST helper — safe when Hostinger returns plain-text 403 instead of JSON. */
export async function postJsonApi(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const { json, text } = await readApiJson(res);
  if (!res.ok) {
    throw new Error(getApiErrorMessage(res, json, text));
  }

  return json;
}

/** Strip HTML/special chars and cap length — reduces Hostinger WAF false positives. */
export function sanitizeJobDescription(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\w\s.,;:!?@#$%&*()\-+/'"\n]/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000);
}

/** Lighter sanitizer for short free-text fields (interview notes, etc.). */
export function sanitizeFreeText(text, maxLen = 2000) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Escape text before embedding in HTML email bodies. */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Allow only same-origin relative paths for Stripe/auth return URLs. */
export function sanitizeReturnPath(path, fallback = '/dashboard') {
  if (typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//') || trimmed.includes('\\')) return fallback;
  if (/[\r\n\t\0]/.test(trimmed)) return fallback;
  if (trimmed.includes('://')) return fallback;
  // Path only — strip query/hash so callers control those separately.
  const pathOnly = trimmed.split(/[?#]/)[0];
  if (!/^\/[A-Za-z0-9/_\-.%~]*$/.test(pathOnly)) return fallback;
  return pathOnly || fallback;
}

/** Only allow http(s) URLs for user-controlled apply / external links. */
export function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
