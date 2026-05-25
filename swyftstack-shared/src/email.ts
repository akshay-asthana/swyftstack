import { prisma } from "./db.js";
import { Prisma } from "./generated/prisma/index.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { env } from "./env.js";
import {
  renderEmailTemplate,
  type EmailTemplateKey,
  type EmailTemplateVariables,
} from "./email-templates.js";

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  userId?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  essential?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProviderEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface EmailProvider {
  providerName: string;
  sendEmail(message: ProviderEmail): Promise<{ providerMessageId?: string }>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

type EmailProviderConfig = {
  id?: string;
  provider: string;
  name: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string | null;
  apiUrl?: string | null;
  apiKey?: string | null;
};

function parseFrom(value: string): { email: string; name: string } {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim() || "Swyftstack", email: match[2].trim() };
  return { name: "Swyftstack", email: value.trim() || "no-reply@swyftstack.local" };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function templateKey(value: unknown): EmailTemplateKey {
  return typeof value === "string" &&
    ["welcome_google_signup", "usage_threshold_75", "usage_threshold_90", "usage_limit_100", "generic_transactional"].includes(value)
    ? (value as EmailTemplateKey)
    : "generic_transactional";
}

export class LocalDevEmailProvider implements EmailProvider {
  providerName = "local_dev";

  async sendEmail(message: ProviderEmail): Promise<{ providerMessageId?: string }> {
    console.log(`[dev-email] To: ${message.to}`);
    console.log(`[dev-email] Subject: ${message.subject}`);
    console.log(message.text);
    return { providerMessageId: `local-dev-${Date.now()}` };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "Local dev email logger is available." };
  }
}

export class WebhookEmailProvider implements EmailProvider {
  providerName = "webhook";

  constructor(private readonly config: EmailProviderConfig) {}

  async sendEmail(message: ProviderEmail): Promise<{ providerMessageId?: string }> {
    if (!this.config.apiUrl) throw new Error("Email webhook URL is not configured.");
    const res = await fetch(this.config.apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        replyTo: this.config.replyToEmail,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        metadata: message.metadata ?? {},
      }),
    });
    if (!res.ok) throw new Error(`Email webhook failed with HTTP ${res.status}`);
    return { providerMessageId: res.headers.get("x-message-id") ?? undefined };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return this.config.apiUrl
      ? { ok: true, message: "Webhook URL is configured." }
      : { ok: false, message: "Webhook URL is missing." };
  }
}

export class ZeptoMailEmailProvider implements EmailProvider {
  providerName = "zeptomail";

  constructor(private readonly config: EmailProviderConfig) {}

  async sendEmail(message: ProviderEmail): Promise<{ providerMessageId?: string }> {
    if (!this.config.apiUrl || !this.config.apiKey) {
      throw new Error("ZeptoMail API URL or API key is not configured.");
    }
    const res = await fetch(this.config.apiUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Zoho-enczapikey ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        from: {
          address: this.config.fromEmail,
          name: this.config.fromName,
        },
        to: [
          {
            email_address: {
              address: message.to,
            },
          },
        ],
        reply_to: this.config.replyToEmail
          ? [{ address: this.config.replyToEmail }]
          : undefined,
        subject: message.subject,
        htmlbody: message.html,
        textbody: message.text,
        track_clicks: false,
        track_opens: false,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = asRecord(body).message ?? asRecord(body).error ?? `HTTP ${res.status}`;
      throw new Error(`ZeptoMail send failed: ${String(error)}`);
    }
    const data = asRecord(body);
    const messageId =
      stringValue(data.message_id) ??
      stringValue(data.request_id) ??
      stringValue(data.id) ??
      stringValue(asRecord(data.data).message_id);
    return { providerMessageId: messageId };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.config.apiUrl) return { ok: false, message: "ZeptoMail API URL is missing." };
    if (!this.config.apiKey) return { ok: false, message: "ZeptoMail API key is missing." };
    return { ok: true, message: "ZeptoMail provider is configured. Send a test email to verify delivery." };
  }
}

export async function upsertEmailProvider(input: {
  id?: string;
  name: string;
  provider: "zeptomail" | "local_dev" | "webhook";
  status: "active" | "disabled";
  fromEmail: string;
  fromName: string;
  replyToEmail?: string | null;
  apiUrl?: string | null;
  apiKey?: string | null;
  config?: Record<string, unknown>;
}) {
  if (input.status === "active") {
    await prisma.emailProvider.updateMany({
      where: input.id ? { id: { not: input.id } } : {},
      data: { status: "disabled" },
    });
  }
  const data = {
    name: input.name,
    provider: input.provider,
    status: input.status,
    fromEmail: input.fromEmail,
    fromName: input.fromName,
    replyToEmail: input.replyToEmail || null,
    apiUrl: input.apiUrl || "",
    ...(input.apiKey ? { encryptedApiKey: encryptSecret(input.apiKey) } : {}),
    config: (input.config ?? {}) as Prisma.InputJsonValue,
  };
  if (input.id) {
    return prisma.emailProvider.update({ where: { id: input.id }, data });
  }
  return prisma.emailProvider.create({ data });
}

export async function activeEmailProvider(): Promise<EmailProvider> {
  const row = await prisma.emailProvider.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
  });
  if (row) {
    const config: EmailProviderConfig = {
      id: row.id,
      provider: row.provider,
      name: row.name,
      fromEmail: row.fromEmail,
      fromName: row.fromName,
      replyToEmail: row.replyToEmail,
      apiUrl: row.apiUrl,
      apiKey: row.encryptedApiKey ? decryptSecret(row.encryptedApiKey) : null,
    };
    if (row.provider === "zeptomail") return new ZeptoMailEmailProvider(config);
    if (row.provider === "webhook") return new WebhookEmailProvider(config);
    if (env.NODE_ENV === "production") {
      throw new Error("The local_dev email provider cannot be active in production.");
    }
    return new LocalDevEmailProvider();
  }

  if (env.ZEPTOMAIL_API_URL && env.ZEPTOMAIL_API_KEY) {
    return new ZeptoMailEmailProvider({
      provider: "zeptomail",
      name: "ZeptoMail env fallback",
      fromEmail: env.ZEPTOMAIL_FROM_EMAIL || parseFrom(env.EMAIL_FROM).email,
      fromName: env.ZEPTOMAIL_FROM_NAME || parseFrom(env.EMAIL_FROM).name,
      apiUrl: env.ZEPTOMAIL_API_URL,
      apiKey: env.ZEPTOMAIL_API_KEY,
    });
  }

  if (env.EMAIL_WEBHOOK_URL) {
    const from = parseFrom(env.EMAIL_FROM);
    return new WebhookEmailProvider({
      provider: "webhook",
      name: "Webhook env fallback",
      fromEmail: from.email,
      fromName: from.name,
      apiUrl: env.EMAIL_WEBHOOK_URL,
    });
  }

  if (env.NODE_ENV === "production") {
    throw new Error("No active email provider configured. Add ZeptoMail in Settings or set ZEPTOMAIL_* env vars.");
  }
  return new LocalDevEmailProvider();
}

export async function queueEmailDelivery(deliveryId: string): Promise<void> {
  await prisma.job.create({
    data: {
      type: "send_email",
      payload: { deliveryId },
      priority: 40,
      maxAttempts: 5,
      queue: "default",
      runAfter: new Date(),
    },
  });
}

export async function sendTransactionalEmail(message: TransactionalEmail): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      userId: message.userId ?? null,
      organizationId: message.organizationId ?? null,
      projectId: message.projectId ?? null,
      type: "system",
      severity: "info",
      title: message.subject,
      message: message.text,
      metadata: {
        ...(message.metadata ?? {}),
        email: {
          to: message.to,
          templateKey: "generic_transactional",
          variables: {
            subject: message.subject,
            text: message.text,
            html: message.html ?? null,
          },
          essential: message.essential === true,
        },
      },
    },
  });
  const delivery = await prisma.notificationDelivery.create({
    data: {
      notificationId: notification.id,
      channel: "email",
      status: "pending",
      metadata: {
        to: message.to,
        templateKey: "generic_transactional",
        variables: {
          subject: message.subject,
          text: message.text,
          html: message.html ?? null,
        },
        essential: message.essential === true,
      },
    },
  });
  await queueEmailDelivery(delivery.id);
  if (env.NODE_ENV !== "production") {
    console.log(`[email-queued] ${message.to} "${message.subject}" delivery=${delivery.id}`);
  }
}

export async function sendEmailDelivery(deliveryId: string): Promise<{ status: string; provider?: string }> {
  const delivery = await prisma.notificationDelivery.findUnique({
    where: { id: deliveryId },
    include: { notification: { include: { user: true } } },
  });
  if (!delivery || delivery.channel !== "email") return { status: "skipped" };
  if (delivery.status === "sent" || delivery.status === "skipped") {
    return { status: delivery.status, provider: delivery.provider ?? undefined };
  }

  const deliveryMeta = asRecord(delivery.metadata);
  const notificationMeta = asRecord(delivery.notification.metadata);
  const emailMeta = { ...asRecord(notificationMeta.email), ...deliveryMeta };
  const to = stringValue(emailMeta.to) ?? delivery.notification.user?.email;
  if (!to) {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "skipped", errorMessage: "No recipient email available." },
    });
    return { status: "skipped" };
  }

  const essential = boolValue(emailMeta.essential);
  const user = delivery.notification.user;
  if (user && !user.emailVerified && !essential) {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "skipped", errorMessage: "Recipient email is not verified." },
    });
    return { status: "skipped" };
  }

  const key = templateKey(emailMeta.templateKey);
  const variables = asRecord(emailMeta.variables) as EmailTemplateVariables;
  const rendered = renderEmailTemplate(key, variables);
  const attempts = delivery.attempts + 1;

  try {
    const provider = await activeEmailProvider();
    const result = await provider.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      metadata: {
        notificationId: delivery.notificationId,
        deliveryId: delivery.id,
        type: delivery.notification.type,
      },
    });
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "sent",
        provider: provider.providerName,
        providerMessageId: result.providerMessageId ?? null,
        errorMessage: null,
        attempts,
        sentAt: new Date(),
      },
    });
    return { status: "sent", provider: provider.providerName };
  } catch (err) {
    const exhausted = attempts >= 3;
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "failed" : "pending",
        errorMessage: String(err),
        attempts,
      },
    });
    if (!exhausted) throw err;
    return { status: "failed" };
  }
}

export async function sendPendingEmailDeliveries(limit = 10): Promise<{ processed: number }> {
  const rows = await prisma.notificationDelivery.findMany({
    where: { channel: "email", status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const row of rows) {
    await sendEmailDelivery(row.id).catch((err) =>
      console.error(`[email-worker] delivery ${row.id} failed:`, String(err)),
    );
  }
  return { processed: rows.length };
}
