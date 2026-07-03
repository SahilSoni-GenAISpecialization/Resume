/** Helpers for saved application documents (resume, cover letter, thank-you). */

import { getStoredThankYouEmail } from '@/lib/thank-you-storage';

export { getStoredThankYouEmail, parseThankYouPayload as parseThankYouEmail } from '@/lib/thank-you-storage';

export function hasTailoredResume(app) {
  return Boolean(String(app?.tailored_resume || '').trim());
}

export function hasCoverLetter(app) {
  return Boolean(String(app?.cover_letter || '').trim());
}

export function hasThankYouEmail(app) {
  return Boolean(getStoredThankYouEmail(app));
}

export function countSavedGenerations(applications) {
  let resumes = 0;
  let coverLetters = 0;
  let thankYouEmails = 0;

  for (const app of applications || []) {
    if (hasTailoredResume(app)) resumes += 1;
    if (hasCoverLetter(app)) coverLetters += 1;
    if (hasThankYouEmail(app)) thankYouEmails += 1;
  }

  return {
    resumes,
    coverLetters,
    thankYouEmails,
    total: resumes + coverLetters + thankYouEmails,
  };
}

export function searchUrlForApplication(app) {
  const params = new URLSearchParams();
  if (app?.job_title) params.set('q', app.job_title);
  if (app?.company) params.set('company', app.company);
  const query = params.toString();
  return query ? `/search?${query}` : '/search';
}
