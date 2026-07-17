import { NextResponse } from 'next/server';
import { escapeHtml, sanitizeFreeText } from '@/lib/api-response';
import { CAREERS_EMAIL } from '@/lib/site-config';
import { getEmailConfigError, isEmailConfigured, sendEmail } from '@/lib/send-email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!isEmailConfigured()) {
      console.error('SEND CAREERS ERROR:', getEmailConfigError());
      return NextResponse.json(
        {
          error:
            'Application email is temporarily unavailable. Please email careers@applymatic.ca directly or try again later.',
          code: 'SMTP_NOT_CONFIGURED',
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
    const linkedin = sanitizeFreeText(body?.linkedin, 500);
    const message = sanitizeFreeText(body?.message, 4000);

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const subject = `Careers application — ${name}`;
    const text = [
      message,
      '',
      '---',
      `Name: ${name}`,
      `Email: ${email}`,
      `LinkedIn / portfolio: ${linkedin || 'Not provided'}`,
    ].join('\n');

    await sendEmail({
      to: CAREERS_EMAIL,
      replyTo: email,
      subject,
      text,
      html: escapeHtml(text).replace(/\n/g, '<br>'),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('SEND CAREERS ERROR:', err?.message || err);
    return NextResponse.json(
      {
        error:
          'Could not send your application. Please try again later or email careers@applymatic.ca directly.',
      },
      { status: 500 }
    );
  }
}
