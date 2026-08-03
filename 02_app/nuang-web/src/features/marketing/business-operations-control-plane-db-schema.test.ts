import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608030004_business_operations_control_plane.sql",
  ),
  "utf8",
);

describe("business operations control plane database contract", () => {
  it("requires a test of the exact saved campaign version before approval", () => {
    expect(sql).toContain("content_fingerprint");
    expect(sql).toContain("last_test_content_fingerprint");
    expect(sql).toContain("marketing_campaign_current_version_test_required");
    expect(sql).toContain("admin_record_marketing_campaign_test");
  });

  it("enforces emergency stop and a final pre-provider authorization", () => {
    expect(sql).toContain("marketing_channel_control");
    expect(sql).toContain("marketing_channel_emergency_paused");
    expect(sql).toContain("authorize_marketing_email_delivery");
    expect(sql).toContain("authorize_marketing_confirmation_delivery");
    expect(sql).toContain("campaign_control_changed");
  });

  it("deduplicates webhooks and promotes provider-risk suppression", () => {
    expect(sql).toContain("marketing_webhook_receipt");
    expect(sql).toContain("on conflict (svix_id) do nothing");
    expect(sql).toContain("email.delivery_delayed");
    expect(sql).toContain("email.failed");
    expect(sql).toContain("email.suppressed");
    expect(sql).toContain(
      "on conflict (account_id, channel) where removed_at is null do update set",
    );
  });

  it("provides exact aggregate, worker health and bounded metadata retention", () => {
    expect(sql).toContain("marketing_campaign_operations_summary");
    expect(sql).toContain("admin_marketing_operations_snapshot");
    expect(sql).toContain("marketing_worker_run");
    expect(sql).toContain("prune_business_operations_metadata");
    expect(sql).toContain("interval '90 days'");
  });

  it("prevents advertising state skipping and unimplemented direct activation", () => {
    expect(sql).toContain("advertising_campaign_transition_not_allowed");
    expect(sql).toContain("direct_advertising_delivery_not_available");
    expect(sql).toContain("approved_coupang_creative_required");
    expect(sql).toContain("advertising_campaign_delivery_gate_blocked");
  });

  it("makes advertising inquiry mail health and safe recovery operable", () => {
    expect(sql).toContain("advertising_mail_worker_run");
    expect(sql).toContain("record_advertising_mail_worker_run");
    expect(sql).toContain("admin_advertising_mail_operations_snapshot");
    expect(sql).toContain("admin_retry_advertising_inquiry_mail");
    expect(sql).toContain("and provider_message_id is null");
  });
});
