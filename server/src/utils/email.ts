import { env } from '../config/env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendViaResend(opts: EmailOptions): Promise<void> {
  const { Resend } = await import('resend');
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

async function sendViaSMTP(opts: EmailOptions): Promise<void> {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transporter.sendMail({ from: env.EMAIL_FROM, ...opts });
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (env.RESEND_API_KEY) {
    await sendViaResend(opts);
  } else if (env.SMTP_HOST) {
    await sendViaSMTP(opts);
  } else {
    // Dev fallback — log to console
    console.log('\n📧 EMAIL (dev mode — no provider configured)');
    console.log(`To: ${opts.to}`);
    console.log(`Subject: ${opts.subject}`);
    console.log(opts.html.replace(/<[^>]+>/g, ''));
    console.log('---\n');
  }
}

export function otpEmailHtml(otp: string, name: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#6366f1">PixelVault</h2>
      <p>Hi ${name},</p>
      <p>Your verification code is:</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1e293b">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:14px">This code expires in ${env.OTP_EXPIRES_MINUTES} minutes. Do not share it with anyone.</p>
    </div>
  `;
}
