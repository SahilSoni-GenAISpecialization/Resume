import { NextResponse } from 'next/server';
import { sanitizeFreeText } from '@/lib/api-response';
import { CONTACT_EMAIL } from '@/lib/site-config';
import { getEmailConfigError, isEmailConfigured, sendEmail } from '@/lib/send-email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!isEmailConfigured()) {
      const configError = getEmailConfigError();
      console.error('SEND CONTACT ERROR:', configError);
      return NextResponse.json(
        {
          error:
            'Contact email is temporarily unavailable. Please email us directly at info@applymatic.ca or try again later.',
          code: 'SMTP_NOT_CONFIGURED',
          detail: configError,
        },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }

    const name = sanitizeFreeText(body?.name, 120);
    const email = sanitizeFreeText(body?.email, 200);
    const subject = sanitizeFreeText(body?.subject, 200) || 'Applymatic inquiry';
    const message = sanitizeFreeText(body?.message, 4000);

    if (!email || !message) {
      return NextResponse.json({ error: 'Email and message are required.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const mailSubject = subject.startsWith('Applymatic') ? subject : `Applymatic — ${subject}`;
    const text = [
      message,
      '',
      '---',
      `From: ${name || 'Not provided'}`,
      `Reply-to email: ${email}`,
    ].join('\n');

    await sendEmail({
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: mailSubject,
      text,
      html: text.replace(/\n/g, '<br>'),
    });

    try {
      await sendEmail({
        to: email,
        subject: 'We received your message — Applymatic',
        text: [
          `Hi${name ? ` ${name}` : ''},`,
          '',
          'Thanks for reaching out to Applymatic. We received your message and will be in touch soon.',
          '',
          '— The Applymatic team',
        ].join('\n'),
      });
    } catch (autoReplyErr) {
      console.warn('CONTACT AUTO-REPLY SKIPPED:', autoReplyErr?.message || autoReplyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('SEND CONTACT ERROR:', err?.message || err);
    const smtpHint =
      err?.code === 'EAUTH'
        ? 'SMTP authentication failed — check SMTP_USER and SMTP_PASS.'
        : err?.code === 'ECONNECTION' || err?.code === 'ETIMEDOUT'
          ? 'Could not connect to the mail server — check SMTP_HOST and SMTP_PORT.'
          : null;
    return NextResponse.json(
      {
        error: smtpHint || 'Could not send your message. Please try again later or email info@applymatic.ca directly.',
      },
      { status: 500 }
    );
  }
}
