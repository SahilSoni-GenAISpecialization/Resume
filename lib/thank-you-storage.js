/** Persist and read thank-you emails on application rows (column + notes fallback). */

export const THANK_YOU_NOTES_MARKER = '\n[[APPLYMATIC_THANK_YOU]]\n';

export function serializeThankYouEmail(result) {
  return JSON.stringify({
    subject: result?.subject || '',
    body: result?.body || '',
  });
}

export function parseThankYouPayload(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw.trim());
    if (parsed?.subject || parsed?.body) {
      return {
        subject: parsed.subject || '',
        body: parsed.body || '',
      };
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function stripThankYouFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return '';
  const idx = notes.indexOf('[[APPLYMATIC_THANK_YOU]]');
  if (idx === -1) return notes.trim();
  return notes.slice(0, idx).trim();
}

export function parseThankYouFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return null;
  const idx = notes.indexOf('[[APPLYMATIC_THANK_YOU]]');
  if (idx === -1) return null;
  const raw = notes.slice(idx + '[[APPLYMATIC_THANK_YOU]]'.length).trim();
  return parseThankYouPayload(raw);
}

export function getStoredThankYouEmail(app) {
  if (!app) return null;
  return parseThankYouPayload(app.thank_you_email) || parseThankYouFromNotes(app.notes);
}

export function applicationWithThankYou(app, result, saveMeta) {
  const payload = serializeThankYouEmail(result);
  if (saveMeta?.field === 'notes') {
    return { ...app, notes: saveMeta.notes, thank_you_email: payload };
  }
  return { ...app, thank_you_email: payload };
}

/**
 * Save thank-you email on an application row.
 * Tries `thank_you_email` column first, then embeds in `notes` if the column is missing.
 */
export async function saveThankYouEmailToApplication(supabase, applicationId, userId, result, existingNotes) {
  const payload = serializeThankYouEmail(result);

  const { error: columnError } = await supabase
    .from('applications')
    .update({ thank_you_email: payload })
    .eq('id', applicationId)
    .eq('user_id', userId);

  if (!columnError) {
    return { saved: true, field: 'thank_you_email', payload };
  }

  const notesBase = stripThankYouFromNotes(existingNotes || '');
  const notes = notesBase
    ? `${notesBase}${THANK_YOU_NOTES_MARKER}${payload}`
    : `${THANK_YOU_NOTES_MARKER.trim()}${payload}`;

  const { error: notesError } = await supabase
    .from('applications')
    .update({ notes })
    .eq('id', applicationId)
    .eq('user_id', userId);

  if (notesError) {
    return { saved: false, error: notesError.message || columnError.message || 'Could not save thank-you email.' };
  }

  return { saved: true, field: 'notes', payload, notes };
}
