import { afterEach, describe, expect, it, vi } from "vitest";
import { renderEmailTemplate } from "../email-templates.js";
import { ZeptoMailEmailProvider } from "../email.js";
import {
  highestCrossedThreshold,
  usagePercent,
  usageThresholdCopy,
} from "../notifications.js";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("usage notification thresholds", () => {
  it("selects only the highest crossed threshold", () => {
    expect(highestCrossedThreshold(74.9)).toBeNull();
    expect(highestCrossedThreshold(75)).toBe(75);
    expect(highestCrossedThreshold(95)).toBe(90);
    expect(highestCrossedThreshold(100)).toBe(100);
    expect(highestCrossedThreshold(137)).toBe(100);
  });

  it("calculates percentages and treats missing limits as unlimited", () => {
    expect(usagePercent(75n, 100n)).toBe(75);
    expect(usagePercent(749n, 1000n)).toBe(74.9);
    expect(usagePercent(1n, null)).toBeNull();
    expect(usagePercent(1n, 0n)).toBeNull();
  });

  it("uses plain-English threshold copy", () => {
    expect(usageThresholdCopy("object storage", 75, "18.8 GB", "25 GB").title).toBe(
      "You've used 75% of your object storage limit",
    );
    expect(usageThresholdCopy("egress", 100, "100 GB", "100 GB").type).toBe("usage_limit_reached");
  });
});

describe("email templates and ZeptoMail provider", () => {
  it("renders usage threshold email templates", () => {
    const rendered = renderEmailTemplate("usage_threshold_90", {
      resourceName: "database storage",
      currentUsage: "9 GB",
      limit: "10 GB",
      percent: 90,
      actionUrl: "https://example.test/console/usage",
    });
    expect(rendered.subject).toBe("You've used 90% of your database storage limit");
    expect(rendered.text).toContain("9 GB of 10 GB");
    expect(rendered.html).toContain("View usage");
  });

  it("builds the ZeptoMail request without logging or exposing the token", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ message_id: "zepto-message-1" }),
      } as Response;
    });

    const provider = new ZeptoMailEmailProvider({
      provider: "zeptomail",
      name: "ZeptoMail",
      fromEmail: "no-reply@swyftstack.test",
      fromName: "Swyftstack",
      apiUrl: "https://api.zeptomail.test/v1.1/email",
      apiKey: "secret-token",
    });
    const result = await provider.sendEmail({
      to: "user@example.test",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result.providerMessageId).toBe("zepto-message-1");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.zeptomail.test/v1.1/email");
    expect(calls[0].init.headers).toMatchObject({
      authorization: "Zoho-enczapikey secret-token",
    });
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.from.address).toBe("no-reply@swyftstack.test");
    expect(body.to[0].email_address.address).toBe("user@example.test");
    expect(JSON.stringify(body)).not.toContain("secret-token");
  });
});
