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
