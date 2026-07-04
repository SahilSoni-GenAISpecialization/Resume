export function buildMailtoHref({ to, subject, message, name, email, extraLines = [] }) {
  const finalSubject = subject?.trim() || 'Applymatic inquiry';
  const bodyLines = [
    message?.trim() || '(no message provided)',
    '',
    '---',
    `From: ${name?.trim() || 'Not provided'}`,
    `Reply-to email: ${email?.trim() || 'Not provided'}`,
    ...extraLines,
  ];

  return `mailto:${to}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(
    bodyLines.join('\n')
  )}`;
}
