import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Helper to parse boolean env vars
const parseBool = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return !!val;
  if (!val) return false;
  const s = String(val).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
};

const parsePort = (val, fallback = 587) => {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parsePort(process.env.SMTP_PORT, 587),
  secure: parseBool(process.env.SMTP_SECURE),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req) {
  try {
    const { name, email, message, captchaToken } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Verify CAPTCHA
    if (!captchaToken) {
      return NextResponse.json(
        { error: 'CAPTCHA verification is required.' },
        { status: 400 }
      );
    }

    const secret =
      process.env.RECAPTCHA_SECRET || process.env.CAPTCHA_SECRET;
    if (!secret) {
      console.error('Contact API: RECAPTCHA_SECRET / CAPTCHA_SECRET not set');
      return NextResponse.json(
        { error: 'CAPTCHA is not configured.' },
        { status: 503 }
      );
    }

    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: captchaToken,
      }),
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return NextResponse.json(
        { error: 'CAPTCHA verification failed.' },
        { status: 400 }
      );
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    // Send Email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER,
      subject: `Contact Form Submission from ${String(name).slice(0, 100)}`,
      replyTo: email,
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Message:</strong><br>${safeMessage}</p>`,
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your message has been received and emailed.',
    });
  } catch (err) {
    console.error('Contact API error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
