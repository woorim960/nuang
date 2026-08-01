import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyResendWebhookSignature } from "@/features/advertising/server-resend-webhook";

describe("Resend webhook signature", () => {
  const rawBody = JSON.stringify({ type: "email.delivered" });
  const timestamp = "1785542400";
  const messageId = "msg_test";
  const key = Buffer.from("resend-test-secret");

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("AD_RESEND_WEBHOOK_SECRET", `whsec_${key.toString("base64")}`);
  });

  it("accepts a current valid Svix signature", () => {
    const signature = createHmac("sha256", key)
      .update(`${messageId}.${timestamp}.${rawBody}`)
      .digest("base64");
    expect(
      verifyResendWebhookSignature({
        headers: new Headers({
          "svix-id": messageId,
          "svix-signature": `v1,${signature}`,
          "svix-timestamp": timestamp,
        }),
        now: Number(timestamp) * 1000,
        rawBody,
      }),
    ).toBe(true);
  });

  it("rejects tampering and stale requests", () => {
    const signature = createHmac("sha256", key)
      .update(`${messageId}.${timestamp}.${rawBody}`)
      .digest("base64");
    const headers = new Headers({
      "svix-id": messageId,
      "svix-signature": `v1,${signature}`,
      "svix-timestamp": timestamp,
    });
    expect(
      verifyResendWebhookSignature({
        headers,
        now: Number(timestamp) * 1000,
        rawBody: `${rawBody} `,
      }),
    ).toBe(false);
    expect(
      verifyResendWebhookSignature({
        headers,
        now: (Number(timestamp) + 301) * 1000,
        rawBody,
      }),
    ).toBe(false);
  });
});
