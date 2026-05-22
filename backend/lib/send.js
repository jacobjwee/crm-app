async function sendEmail({ to, subject, body }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email not configured — add SMTP credentials to backend/.env');
  }
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'CRM'}" <${process.env.SMTP_USER}>`,
    to,
    subject: subject || '(no subject)',
    text: body,
  });
}

async function sendSMS({ to, body }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('SMS not configured — add Twilio credentials to backend/.env');
  }
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({ body, from: process.env.TWILIO_FROM, to });
}

module.exports = { sendEmail, sendSMS };
