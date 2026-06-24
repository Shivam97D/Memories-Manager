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
  // SMTP (Gmail / any) takes priority — works with any recipient
  // Resend with onboarding@resend.dev only delivers to the Resend account owner's email
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    await sendViaSMTP(opts);
  } else if (env.RESEND_API_KEY) {
    await sendViaResend(opts);
  } else {
    console.log('\n📧 EMAIL (dev — no provider configured)');
    console.log(`To: ${opts.to} | Subject: ${opts.subject}`);
    console.log('OTP would appear here in production');
  }
}

export function resetPasswordEmailHtml(otp: string, name: string, email: string): string {
  const firstName = name.split(' ')[0];
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your PixelVault password</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:#6366f1;border-radius:12px;padding:10px 14px;vertical-align:middle;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">⬡ PixelVault</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="background:linear-gradient(135deg,#ef4444 0%,#f97316 100%);height:6px;"></td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:40px 40px 32px;">
                <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                  Hi ${firstName}, reset your password 🔑
                </p>
                <p style="margin:0 0 32px;font-size:15px;color:#64748b;line-height:1.6;">
                  We received a request to reset your PixelVault password. Use the code below — it expires in <strong style="color:#0f172a;">${env.OTP_EXPIRES_MINUTES} minutes</strong>.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                  <tr>
                    <td align="center" style="background:#fef2f2;border:2px dashed #fca5a5;border-radius:12px;padding:28px 20px;">
                      <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#ef4444;">Password reset code</p>
                      <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:14px;color:#0f172a;line-height:1;">${otp}</p>
                    </td>
                  </tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="background:#fef9c3;border-left:3px solid #eab308;border-radius:0 8px 8px 0;padding:14px 16px;">
                      <p style="margin:0;font-size:13px;color:#713f12;line-height:1.5;">
                        🔒 <strong>Didn't request this?</strong> You can safely ignore this email. Your password will not change unless you complete the reset.
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                  For security, this code can only be used once and expires in ${env.OTP_EXPIRES_MINUTES} minutes.
                </p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" /></td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:20px 40px 32px;">
                <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:1.6;">
                  Sent to <strong>${email}</strong> · PixelVault — Your cloud media library, all in one place.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${year} PixelVault · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function otpEmailHtml(otp: string, name: string, email: string): string {
  const firstName = name.split(' ')[0];
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PixelVault Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#6366f1;border-radius:12px;padding:10px 14px;vertical-align:middle;">
                    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">⬡ PixelVault</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

              <!-- Purple top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);height:6px;"></td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 40px 32px;">

                    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                      Hi ${firstName}, verify your email 👋
                    </p>
                    <p style="margin:0 0 32px;font-size:15px;color:#64748b;line-height:1.6;">
                      Use the code below to verify your PixelVault account. It expires in <strong style="color:#0f172a;">${env.OTP_EXPIRES_MINUTES} minutes</strong>.
                    </p>

                    <!-- OTP box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                      <tr>
                        <td align="center" style="background:#f8fafc;border:2px dashed #c7d2fe;border-radius:12px;padding:28px 20px;">
                          <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#6366f1;">Your verification code</p>
                          <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:14px;color:#0f172a;line-height:1;">${otp}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background:#fef9c3;border-left:3px solid #eab308;border-radius:0 8px 8px 0;padding:14px 16px;">
                          <p style="margin:0;font-size:13px;color:#713f12;line-height:1.5;">
                            🔒 <strong>Never share this code.</strong> PixelVault will never ask for your OTP via phone, chat, or support tickets.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                      If you didn't create a PixelVault account, you can safely ignore this email — no account will be created.
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" /></td>
                </tr>
              </table>

              <!-- Footer inside card -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 40px 32px;">
                    <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:1.6;">
                      Sent to <strong>${email}</strong> because you signed up for PixelVault.
                      Your cloud media library, all in one place.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer outside card -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${year} PixelVault · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
