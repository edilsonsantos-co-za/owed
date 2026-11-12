// Account emails (welcome, account deleted), sent through the DataSparkLab mail service (useSend SMTP).
// With SMTP_HOST unset nothing is sent: the email is logged, so local dev and the hosted demo never fail on mail.
import 'server-only';
import nodemailer from 'nodemailer';
import { EMAIL_BUTTON, EMAIL_LAYOUT, EMAIL_MUTED } from './email-layout';

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const p = (s: string) => `<p style="margin:0 0 16px;">${s}</p>`;
const small = (s: string) => `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${EMAIL_MUTED};">${s}</p>`;
const button = (href: string, label: string) => EMAIL_BUTTON.replace('%%HREF%%', esc(href)).replace('%%LABEL%%', esc(label));

function render(o: { title: string; preheader: string; eyebrow: string; body: string }): string {
  return EMAIL_LAYOUT.replaceAll('%%TITLE%%', esc(o.title))
    .replace('%%PREHEADER%%', esc(o.preheader))
    .replace('%%EYEBROW%%', esc(o.eyebrow))
    .replace('%%BODY%%', o.body);
}

const hi = (name?: string) => `Hi ${esc(name?.split(' ')[0] || 'there')},`;

export function welcomeEmail(o: { name?: string; email: string; appUrl: string; accountUrl: string }): Email {
  const subject = 'Welcome to Owed';
  return {
    subject,
    html: render({
      title: subject,
      preheader: 'Your Owed account is ready: see who owes you, and let the agents draft the follow-ups.',
      eyebrow: 'New account',
      body:
        p(`${hi(o.name)} your Owed account is ready.`) +
        p('Owed watches your PayPal invoices, shows who owes you and drafts polite reminders. Nothing reaches a client until you approve it.') +
        button(o.appUrl, 'Open your dashboard') +
        small(`You signed in with your DataSparkLab account (${esc(o.email)}). Change your name or password, or delete your Owed account, any time from <a href="${esc(o.accountUrl)}" style="color:${EMAIL_MUTED};">your profile</a>.`),
    }),
    text: `${o.name ? `Hi ${o.name.split(' ')[0]},` : 'Hi there,'} your Owed account is ready.\n\nOpen your dashboard: ${o.appUrl}\n\nYour profile (name, password, delete your account): ${o.accountUrl}`,
  };
}

export function accountDeletedEmail(o: { name?: string; siteUrl: string }): Email {
  const subject = 'Your Owed account is deleted';
  return {
    subject,
    html: render({
      title: subject,
      preheader: 'Your Owed account and its data are gone.',
      eyebrow: 'Account',
      body:
        p(`${hi(o.name)} your Owed account is deleted, and you're signed out.`) +
        p('Your DataSparkLab sign-in is unchanged. If you sign in to Owed again, a new, empty account starts.') +
        small(`Changed your mind? You're welcome back any time at <a href="${esc(o.siteUrl)}" style="color:${EMAIL_MUTED};">owed.edilsonsantos.co.za</a>.`),
    }),
    text: `Your Owed account is deleted, and you're signed out.\n\nYour DataSparkLab sign-in is unchanged. Signing in to Owed again starts a new, empty account.`,
  };
}

let transport: nodemailer.Transporter | null | undefined;

function getTransport(): nodemailer.Transporter | null {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) return (transport = null);
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    // The internal useSend SMTP proxy (a bare container name) offers no STARTTLS; public hosts must.
    requireTLS: host.includes('.'),
    ignoreTLS: !host.includes('.'),
    auth: process.env.SMTP_USERNAME ? { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD ?? '' } : undefined,
  });
  return transport;
}

/** Sends one email. Never throws: mail trouble must not break sign-in or account changes. */
export async function sendEmail(to: string, email: Email): Promise<boolean> {
  const t = getTransport();
  if (!t) {
    console.info(`[owed] mail off (SMTP_HOST unset): "${email.subject}" to ${to} not sent`);
    return false;
  }
  try {
    await t.sendMail({
      from: { name: 'Owed', address: process.env.MAIL_FROM_ADDRESS || 'noreply@edilsonsantos.co.za' },
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return true;
  } catch (err) {
    console.error(`[owed] could not send "${email.subject}"`, err);
    return false;
  }
}
