import { env } from "./env.js";

export type EmailTemplateKey =
  | "welcome_google_signup"
  | "usage_threshold_75"
  | "usage_threshold_90"
  | "usage_limit_100"
  | "generic_transactional";

export interface EmailTemplateVariables {
  userName?: string | null;
  resourceName?: string;
  currentUsage?: string;
  limit?: string;
  percent?: number;
  actionUrl?: string;
  planName?: string | null;
  organizationName?: string | null;
  projectName?: string | null;
  subject?: string;
  text?: string;
  html?: string;
}

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraph(text: string): string {
  return `<p>${escapeHtml(text)}</p>`;
}

function cta(label: string, url: string): string {
  const safeUrl = escapeHtml(url);
  return `<p><a href="${safeUrl}" style="display:inline-block;background:#6d5ef6;color:#fff;text-decoration:none;border-radius:8px;padding:10px 14px;font-weight:700">${escapeHtml(label)}</a></p>`;
}

function layout(title: string, body: string): string {
  return [
    `<div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#14161c;line-height:1.55;max-width:620px">`,
    `<h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">${escapeHtml(title)}</h1>`,
    body,
    `<p style="color:#79808f;font-size:12px;margin-top:24px">Swyftstack transactional notification</p>`,
    `</div>`,
  ].join("");
}

function usageSubject(percent: number, resource: string): string {
  return percent >= 100
    ? `You've reached your ${resource} limit`
    : `You've used ${percent}% of your ${resource} limit`;
}

export function renderEmailTemplate(
  key: EmailTemplateKey,
  variables: EmailTemplateVariables = {},
): RenderedEmailTemplate {
  if (key === "generic_transactional") {
    const subject = variables.subject ?? "Swyftstack notification";
    const text = variables.text ?? "";
    return {
      subject,
      text,
      html: variables.html ?? layout(subject, text.split("\n\n").map(paragraph).join("")),
    };
  }

  if (key === "welcome_google_signup") {
    const name = variables.userName?.trim() || "there";
    const actionUrl = variables.actionUrl || new URL("/console", env.USERAPP_BASE_URL).toString();
    const text = [
      `Welcome to Swyftstack, ${name}.`,
      "You can now create projects, provision Postgres databases, create storage buckets, and manage usage from the console.",
      `Go to Console: ${actionUrl}`,
    ].join("\n\n");
    return {
      subject: "Welcome to Swyftstack",
      text,
      html: layout(
        "Welcome to Swyftstack",
        [
          paragraph(`Welcome to Swyftstack, ${name}.`),
          paragraph("You can now create projects, provision Postgres databases, create storage buckets, and manage usage from the console."),
          cta("Go to Console", actionUrl),
        ].join(""),
      ),
    };
  }

  const resource = variables.resourceName ?? "resource";
  const percent = variables.percent ?? (key === "usage_threshold_75" ? 75 : key === "usage_threshold_90" ? 90 : 100);
  const current = variables.currentUsage ?? "current usage";
  const limit = variables.limit ?? "your limit";
  const actionUrl = variables.actionUrl || new URL("/console/usage", env.USERAPP_BASE_URL).toString();
  const subject = usageSubject(percent, resource);
  const message =
    percent >= 100
      ? `Your ${resource} usage has reached your plan limit: ${current} of ${limit}. New usage may be blocked until you upgrade or reduce usage.`
      : percent >= 90
        ? `Your ${resource} usage is almost at your plan limit: ${current} of ${limit}. Upgrade or reduce usage to avoid service interruption.`
        : `Your ${resource} usage is at ${current} of ${limit}. Consider upgrading before you hit the limit.`;
  const context = [
    variables.organizationName ? `Organization: ${variables.organizationName}` : "",
    variables.planName ? `Plan: ${variables.planName}` : "",
    variables.projectName ? `Project: ${variables.projectName}` : "",
  ].filter(Boolean);

  return {
    subject,
    text: [message, ...context, `View usage: ${actionUrl}`].join("\n\n"),
    html: layout(subject, [paragraph(message), ...context.map(paragraph), cta("View usage", actionUrl)].join("")),
  };
}
