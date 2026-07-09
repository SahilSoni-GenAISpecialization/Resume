export const PAGE_SIZE = 10;

export const JobProvider = {
  JSEARCH: 'jsearch',
  FREEHIRE: 'freehire',
};

export function encodeJobId(provider, externalId) {
  return `${provider}:${externalId}`;
}

export function parseJobId(jobId) {
  if (!jobId) return { provider: JobProvider.JSEARCH, externalId: '' };
  const idx = jobId.indexOf(':');
  if (idx === -1) {
    return { provider: JobProvider.JSEARCH, externalId: jobId };
  }
  const provider = jobId.slice(0, idx);
  const externalId = jobId.slice(idx + 1);
  if (provider === JobProvider.FREEHIRE || provider === JobProvider.JSEARCH) {
    return { provider, externalId };
  }
  return { provider: JobProvider.JSEARCH, externalId: jobId };
}

export function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#\d+;|&\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convert HTML job descriptions into readable plain text with paragraphs and bullets. */
export function htmlToFormattedText(value = '') {
  if (!value) return '';
  let html = String(value);

  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  html = html
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : ' ';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");

  html = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|section|article|blockquote|li)>/gi, '\n')
    .replace(/<(p|div|h[1-6]|tr|section|article|blockquote)(\s[^>]*)?>/gi, '\n')
    .replace(/<li(\s[^>]*)?>/gi, '\n• ')
    .replace(/<\/?[uo]l(\s[^>]*)?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  let text = html
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n•\s*\n+/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}
