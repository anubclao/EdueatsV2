import nodemailer from 'nodemailer';

// Transporter lazy-initialized to avoid crashing on missing env vars at boot
let _transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  return _transporter;
};

const otpHtml = (name: string, otp: string, expiresMinutes: number) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu código EduEats</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#064e3b,#059669);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:2rem;">🥗</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:1.5rem;font-weight:700;letter-spacing:-0.5px;">EduEats</h1>
              <p style="margin:4px 0 0;color:#a7f3d0;font-size:0.85rem;">Alimentación escolar inteligente</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 8px;color:#374151;font-size:0.95rem;">Hola, <strong>${name}</strong> 👋</p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:0.9rem;line-height:1.6;">
                Usá este código de un solo uso para iniciar sesión en EduEats.
                Expira en <strong>${expiresMinutes} minutos</strong>.
              </p>

              <!-- OTP block -->
              <div style="background:#f0fdf4;border:2px dashed #6ee7b7;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;color:#065f46;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Tu código de acceso</p>
                <p style="margin:0;font-size:2.8rem;font-weight:800;letter-spacing:10px;color:#064e3b;font-family:'Courier New',monospace;">${otp}</p>
              </div>

              <p style="margin:0;color:#9ca3af;font-size:0.8rem;line-height:1.5;">
                Si no solicitaste este código, podés ignorar este correo. 
                Nadie te lo pedirá por teléfono ni por otro medio.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#d1d5db;font-size:0.75rem;">© ${new Date().getFullYear()} EduEats · No respondas este correo</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Sends an OTP code to the user's email.
 * Returns true if sent, false if email is not configured (non-fatal).
 * Throws on SMTP errors so the caller can decide how to handle them.
 */
export const sendOtpEmail = async (
  to: string,
  name: string,
  otp: string,
  expiresMinutes = 5,
): Promise<boolean> => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[email] EMAIL_USER / EMAIL_PASS no configurados — OTP no enviado por correo.');
    return false;
  }

  await transporter.sendMail({
    from: `"EduEats 🥗" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} es tu código de acceso a EduEats`,
    html: otpHtml(name, otp, expiresMinutes),
  });

  return true;
};
