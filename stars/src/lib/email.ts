import nodemailer from "nodemailer";

/**
 * Pengiriman email lewat SMTP (mis. Gmail + App Password). Diatur di .env / deploy/.env:
 *   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=akun@gmail.com  SMTP_PASS=<16 huruf App Password>
 *   SMTP_FROM="STARS RSUD Cipayung <akun@gmail.com>"   (opsional; bawaan = SMTP_USER)
 * Bila belum diatur, `emailSiap()` = false dan fitur yang memakainya memberi jalan lain (hubungi Admin).
 */
export function emailSiap() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function kirimEmail(ke: string, subjek: string, teks: string, html?: string) {
  if (!emailSiap()) throw new Error("SMTP belum diatur");
  const port = Number(process.env.SMTP_PORT || 465);
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587, // 587 = STARTTLS wajib (Gmail/Office 365); port lain mis. relay internal RS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: ke, subject: subjek, text: teks, html });
}
