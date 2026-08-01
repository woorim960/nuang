import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const inquiryMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202608010002_advertising_inquiry_release_1a.sql",
  ),
  "utf8",
);
const deliveryMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202608010003_advertising_delivery_release_1.sql",
  ),
  "utf8",
);
const retryCronMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202608020001_advertising_mail_outbox_retry_cron.sql",
  ),
  "utf8",
);

describe("advertising database release", () => {
  it("stores an inquiry and exactly two mail intents in one security-definer RPC", () => {
    expect(inquiryMigration).toContain(
      "create or replace function public.submit_advertising_inquiry_atomic",
    );
    const functionBody = inquiryMigration.slice(
      inquiryMigration.indexOf(
        "create or replace function public.submit_advertising_inquiry_atomic",
      ),
      inquiryMigration.indexOf(
        "create or replace function public.claim_advertising_mail_outbox",
      ),
    );
    expect(functionBody).toContain("insert into public.advertising_inquiry (");
    expect(functionBody).toContain(
      "insert into public.advertising_mail_outbox (",
    );
    expect(functionBody).toContain("'operator_notification'");
    expect(functionBody).toContain("'inquirer_receipt'");
    expect(functionBody).toContain("perform pg_advisory_xact_lock");
  });

  it("keeps inquiry data behind service-role-only RLS", () => {
    for (const table of [
      "advertising_inquiry",
      "advertising_inquiry_event",
      "advertising_mail_outbox",
    ]) {
      expect(inquiryMigration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(inquiryMigration).toContain(
        `revoke all on public.${table} from public, anon, authenticated`,
      );
    }
    expect(inquiryMigration).toContain("attempt_count between 0 and 5");
    expect(inquiryMigration).toContain("then 'dead' else 'retry'");
    expect(inquiryMigration).toContain(
      "admin_record_advertising_inquiry_sensitive_access",
    );
    expect(inquiryMigration).toContain(
      "advertising_inquiry_sensitive_fields_viewed",
    );
  });

  it("seeds both slots and every kill switch in a fail-closed state", () => {
    expect(deliveryMigration).toContain("'HOME_INLINE_01'");
    expect(deliveryMigration).toContain("'FEED_COMMERCE_01'");
    expect(deliveryMigration).toContain("('global', 'advertising', true");
    expect(deliveryMigration).toContain(
      "rollout_percentage integer not null default 0",
    );
    expect(deliveryMigration).toContain(
      "create or replace function public.resolve_advertising_delivery",
    );
    expect(deliveryMigration).toContain("policy_approved_at is not null");
    expect(deliveryMigration).toContain(
      "disclosure_text like '%일정액의 수수료%'",
    );
    expect(deliveryMigration).toContain(
      "create or replace function public.admin_upsert_advertising_campaign",
    );
    expect(deliveryMigration).toContain(
      "create or replace function public.admin_upsert_advertising_creative",
    );
    expect(deliveryMigration).toContain(
      "create or replace function public.admin_manage_advertising_inventory",
    );
  });

  it("forbids direct browser access to every delivery and measurement table", () => {
    for (const table of [
      "advertising_inventory",
      "advertising_campaign",
      "advertising_creative",
      "advertising_kill_switch",
      "advertising_feedback",
      "advertising_event",
      "advertising_metric_daily",
    ]) {
      expect(deliveryMigration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(deliveryMigration).toContain(
        `revoke all on public.${table} from public, anon, authenticated`,
      );
    }
  });

  it("runs the mail retry worker every minute without resending completed mail", () => {
    expect(inquiryMigration).toContain(
      "outbox.status in ('pending', 'retry') and outbox.next_attempt_at <= now()",
    );
    expect(inquiryMigration).toContain("for update skip locked");
    expect(inquiryMigration).toContain("when 1 then interval '1 minute'");
    expect(inquiryMigration).toContain("attempt_count < 5");

    expect(retryCronMigration).toContain(
      "create or replace function public.invoke_advertising_mail_outbox_retry()",
    );
    expect(retryCronMigration).toContain("nuang_app_origin");
    expect(retryCronMigration).toContain("nuang_ad_outbox_cron_secret");
    expect(retryCronMigration).toContain("net.http_post(");
    expect(retryCronMigration).toContain(
      "'nuang-advertising-mail-outbox-retry'",
    );
    expect(retryCronMigration).toContain("'* * * * *'");
    expect(retryCronMigration).not.toContain("business@notice.nuang.app");
  });
});
