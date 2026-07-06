import { NextResponse } from 'next/server';
import { sanitizeFreeText } from '@/lib/api-response';
import { CONTACT_EMAIL } from '@/lib/site-config';
import { isEmailConfigured, sendEmail } from '@/lib/send-email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!isEmailConfigured()) {
      console.error('SEND CONTACT ERROR: SMTP is not configured');
      return NextResponse.json(
        { error: 'Contact email is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Expected application/json request body.' }, { status: 415 });
    }

    const body = await request.json();
    const name = sanitizeFreeText(body.name, 120);
    const email = sanitizeFreeText(body.email, 200);
    const subject = sanitizeFreeText(body.subject, 200) || 'Applymatic inquiry';
    const message = sanitizeFreeText(body.message, 4000);

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
    return NextResponse.json(
      { error: 'Could not send your message. Please try again later.' },
      { status: 500 }
    );
  }
}
