import { NextResponse } from 'next/server';
import { sanitizeFreeText } from '@/lib/api-response';
import { CONTACT_EMAIL } from '@/lib/site-config';
import { isEmailConfigured, sendEmail } from '@/lib/send-email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!isEmailConfigured()) {
      console.error('SEND CAREERS ERROR: SMTP is not configured');
      return NextResponse.json(
        { error: 'Application email is temporarily unavailable. Please try again later.' },
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
    const linkedin = sanitizeFreeText(body.linkedin, 500);
    const message = sanitizeFreeText(body.message, 4000);

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
      to: CONTACT_EMAIL,
      replyTo: email,
      subject,
      text,
      html: text.replace(/\n/g, '<br>'),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('SEND CAREERS ERROR:', err?.message || err);
    return NextResponse.json(
      { error: 'Could not send your application. Please try again later.' },
      { status: 500 }
    );
  }
}
