import { env } from "./env.js";

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
}

export async function sendTransactionalEmail(message: TransactionalEmail): Promise<void> {
  const payload = {
    from: env.EMAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
  };

  if (env.EMAIL_WEBHOOK_URL) {
    const res = await fetch(env.EMAIL_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Email webhook failed with HTTP ${res.status}`);
    }
    return;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("EMAIL_WEBHOOK_URL must be configured in production.");
  }

  console.log(`[dev-email] To: ${payload.to}`);
  console.log(`[dev-email] Subject: ${payload.subject}`);
  console.log(payload.text);
}
