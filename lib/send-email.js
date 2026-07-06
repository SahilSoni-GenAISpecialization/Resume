import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export function isEmailConfigured() {
  return getMissingSmtpEnvVars().length === 0;
}

export function getMissingSmtpEnvVars() {
  const missing = [];
  if (!process.env.SMTP_HOST?.trim()) missing.push('SMTP_HOST');
  if (!process.env.SMTP_USER?.trim()) missing.push('SMTP_USER');
  if (!process.env.SMTP_PASS?.trim()) missing.push('SMTP_PASS');
  return missing;
}

export function getEmailConfigError() {
  const missing = getMissingSmtpEnvVars();
  if (missing.length === 0) return null;
  return `Email is not configured on the server (missing: ${missing.join(', ')}).`;
}

export async function sendEmail({ to, subject, text, html, replyTo }) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error(getEmailConfigError() || 'Email is not configured on the server');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
    replyTo,
  });
}
