import { Env } from "../types";

export type EmailTemplateKey = "received" | "in_progress" | "ready" | "handed_over";

export interface EmailResult {
  ok: boolean;
  provider: string;
  response?: unknown;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Plain English email copy for the four order lifecycle notifications.
 */
export function buildEmail(
  env: Env,
  key: EmailTemplateKey,
  ctx: { orderNumber: string; trackUrl?: string; qrCodeUrl?: string }
): EmailContent {
  const shop = env.SHOP_NAME;

  const wrap = (bodyLines: string[], ctaLabel?: string, ctaUrl?: string) => {
    const paragraphs = bodyLines.map((line) => `<p style="margin:0 0 12px;">${line}</p>`).join("");
    const button =
      ctaLabel && ctaUrl
        ? `<p style="margin:20px 0;"><a href="${ctaUrl}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;">${ctaLabel}</a></p>`
        : "";
    const qrImg = ctx.qrCodeUrl
      ? `<p style="margin:20px 0;text-align:center;"><img src="${ctx.qrCodeUrl}" alt="Order QR" width="200" height="200" style="border:1px solid #e5e7eb;border-radius:12px;padding:8px;" /></p>`
      : "";
    return `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;">
        <h2 style="margin:0 0 16px;color:#2563eb;">${shop}</h2>
        ${paragraphs}
        ${qrImg}
        ${button}
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Order ID: ${ctx.orderNumber}</p>
      </div>`;
  };

  switch (key) {
    case "received":
      return {
        subject: `Order Received - ${ctx.orderNumber} | ${shop}`,
        text: `Hello! Your laundry has been received at ${shop}. Order ID: ${ctx.orderNumber}. Track your order: ${ctx.trackUrl}`,
        html: wrap(
          [
            `Hello! Your laundry has been received at <strong>${shop}</strong>.`,
            `Order ID: <strong>${ctx.orderNumber}</strong>`,
          ],
          "View Order Status",
          ctx.trackUrl
        ),
      };
    case "in_progress":
      return {
        subject: `Your Order is Being Processed - ${ctx.orderNumber} | ${shop}`,
        text: `Your laundry is now being processed at ${shop}. Order ID: ${ctx.orderNumber}.`,
        html: wrap([`Your laundry is now being <strong>processed</strong> at <strong>${shop}</strong>.`]),
      };
    case "ready":
      return {
        subject: `Ready for Pickup - ${ctx.orderNumber} | ${shop}`,
        text: `Your laundry is ready! Please come by for pickup. Order ID: ${ctx.orderNumber}. Show this QR at pickup: ${ctx.trackUrl}`,
        html: wrap(
          [`Your laundry is <strong>ready</strong>! Please come by for pickup.`, `Show the QR code below at pickup.`],
          "View Pickup QR",
          ctx.trackUrl
        ),
      };
    case "handed_over":
      return {
        subject: `Thank You! Order Completed - ${ctx.orderNumber} | ${shop}`,
        text: `Thank you! Your laundry has been handed over. We hope to see you again soon - ${shop}.`,
        html: wrap([`Thank you! Your laundry has been <strong>handed over</strong>.`, `We hope to see you again soon - ${shop}.`]),
      };
  }
}

export async function sendEmail(env: Env, to: string, content: EmailContent): Promise<EmailResult> {
  if (!to || !to.includes("@")) {
    return { ok: false, provider: env.EMAIL_PROVIDER, response: "Invalid email address" };
  }

  switch (env.EMAIL_PROVIDER) {
    case "brevo":
      return sendViaBrevo(env, to, content);
    case "console":
      console.log(`[EMAIL -> ${to}] ${content.subject}\n${content.text}`);
      return { ok: true, provider: "console" };
    case "resend":
    default:
      return sendViaResend(env, to, content);
  }
}

/**
 * Resend (https://resend.com) - recommended default. Free tier: 3,000
 * emails/month / 100/day, simple REST API, good deliverability. Requires a
 * verified sending domain (or, for testing only, their sandbox address
 * onboarding@resend.dev which can only send to your own verified account
 * email).
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */
async function sendViaResend(env: Env, to: string, content: EmailContent): Promise<EmailResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${env.FROM_NAME} <${env.FROM_EMAIL}>`,
      to: [to],
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, provider: "resend", response: json };
}

/**
 * Brevo (formerly Sendinblue, https://brevo.com) - alternative provider.
 * Free tier: 300 emails/day, no monthly cap, no credit card required.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */
async function sendViaBrevo(env: Env, to: string, content: EmailContent): Promise<EmailResult> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: env.FROM_NAME, email: env.FROM_EMAIL },
      to: [{ email: to }],
      subject: content.subject,
      htmlContent: content.html,
      textContent: content.text,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, provider: "brevo", response: json };
}
