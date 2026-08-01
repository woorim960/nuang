import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: { rpc: vi.fn() },
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => mocks.client,
}));

import { protectAdvertisingInquiryValue } from "@/features/advertising/server-advertising-inquiry-security";
import {
  drainAdvertisingMailOutbox,
  escapeAdvertisingEmailHtml,
  readAdvertisingNotificationRecipients,
} from "@/features/advertising/server-advertising-mail-outbox";

describe("advertising inquiry mail outbox", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mocks.client.rpc.mockReset();
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 23).toString("base64"));
    vi.stubEnv("AD_CONTACT_HASH_PEPPER", "test-ad-pepper");
    vi.stubEnv(
      "AD_INQUIRY_NOTIFICATION_EMAILS",
      "ops@example.com, OPS@example.com, invalid",
    );
    vi.stubEnv("AD_INQUIRY_FROM", "NUANG <business@example.com>");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://nuang.example");
  });

  it("delivers the two atomic intents with privacy-minimized escaped templates", async () => {
    const inquiryId = "10000000-0000-4000-8000-000000000001";
    const recipientCiphertext = protectAdvertisingInquiryValue({
      field: "outbox_recipient",
      inquiryId,
      value: "business@example.com",
    });
    const rows = [
      {
        attempt_count: 1,
        event_key: `ad-inquiry/operator/${inquiryId}/v1`,
        id: "20000000-0000-4000-8000-000000000001",
        inquiry_id: inquiryId,
        payload: {
          companyName: "브랜드 <script>\nBCC",
          createdAt: "2026-08-01T01:00:00.000Z",
          inquiryType: "banner",
          publicReference: "AD-20260801-ABC234",
        },
        recipient_ciphertext: null,
        recipient_role: "operator",
        template_key: "operator_notification",
      },
      {
        attempt_count: 1,
        event_key: `ad-inquiry/inquirer/${inquiryId}/v1`,
        id: "20000000-0000-4000-8000-000000000002",
        inquiry_id: inquiryId,
        payload: {
          createdAt: "2026-08-01T01:00:00.000Z",
          inquiryType: "banner",
          maskedEmail: "bu***@example.com",
          publicReference: "AD-20260801-ABC234",
        },
        recipient_ciphertext: recipientCiphertext,
        recipient_role: "inquirer",
        template_key: "inquirer_receipt",
      },
    ];
    mocks.client.rpc.mockImplementation(async (name: string) =>
      name === "claim_advertising_mail_outbox"
        ? { data: rows, error: null }
        : { data: { ok: true }, error: null },
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "mail-operator" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "mail-inquirer" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      drainAdvertisingMailOutbox({ inquiryId, limit: 2 }),
    ).resolves.toEqual({ claimed: 2, failed: 0, ok: true, sent: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const operatorRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const operatorMail = JSON.parse(String(operatorRequest.body)) as {
      html: string;
      subject: string;
      to: string[];
    };
    expect(operatorMail.to).toEqual(["ops@example.com"]);
    expect(operatorMail.html).toContain("브랜드 &lt;script&gt;");
    expect(operatorMail.html).not.toContain("business@example.com");
    expect(operatorMail.subject).not.toContain("\n");
    expect(mocks.client.rpc).toHaveBeenCalledWith(
      "complete_advertising_mail_outbox",
      expect.objectContaining({
        target_provider_message_id: "mail-operator",
        target_succeeded: true,
      }),
    );
  });

  it("records a retryable failure instead of throwing when mail is unconfigured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("AD_INQUIRY_FROM", "");
    vi.stubEnv("ADMIN_NOTIFICATION_FROM", "");
    vi.stubEnv("EMAIL_VERIFICATION_FROM", "");
    mocks.client.rpc.mockImplementation(async (name: string) =>
      name === "claim_advertising_mail_outbox"
        ? {
            data: [
              {
                attempt_count: 1,
                event_key: "ad-inquiry/operator/example/v1",
                id: "20000000-0000-4000-8000-000000000001",
                inquiry_id: "10000000-0000-4000-8000-000000000001",
                payload: {
                  companyName: "브랜드",
                  createdAt: "2026-08-01T01:00:00.000Z",
                  inquiryType: "banner",
                  publicReference: "AD-20260801-ABC234",
                },
                recipient_ciphertext: null,
                recipient_role: "operator",
                template_key: "operator_notification",
              },
            ],
            error: null,
          }
        : { data: { ok: true }, error: null },
    );

    await expect(drainAdvertisingMailOutbox()).resolves.toEqual({
      claimed: 1,
      failed: 1,
      ok: true,
      sent: 0,
    });
    expect(mocks.client.rpc).toHaveBeenCalledWith(
      "complete_advertising_mail_outbox",
      expect.objectContaining({
        target_error_code: "mail_not_configured",
        target_succeeded: false,
      }),
    );
  });

  it("escapes every HTML meta-character and deduplicates recipients", () => {
    expect(escapeAdvertisingEmailHtml(`<>&"'`)).toBe(
      "&lt;&gt;&amp;&quot;&#039;",
    );
    expect(readAdvertisingNotificationRecipients()).toEqual([
      "ops@example.com",
    ]);
  });
});
