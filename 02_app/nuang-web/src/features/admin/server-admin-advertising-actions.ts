import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  adminAdvertisingCampaignActionSchema,
  adminAdvertisingCampaignWriteSchema,
  adminAdvertisingCreativeActionSchema,
  adminAdvertisingCreativeWriteSchema,
  adminAdvertisingInquiryActionSchema,
  adminAdvertisingInventoryActionSchema,
  adminAdvertisingKillSwitchActionSchema,
} from "./admin-advertising-contract";
import type { z } from "zod";

type InquiryAction = z.infer<typeof adminAdvertisingInquiryActionSchema>;
type CampaignAction = z.infer<typeof adminAdvertisingCampaignActionSchema>;
type CampaignWrite = z.infer<typeof adminAdvertisingCampaignWriteSchema>;
type CreativeAction = z.infer<typeof adminAdvertisingCreativeActionSchema>;
type CreativeWrite = z.infer<typeof adminAdvertisingCreativeWriteSchema>;
type InventoryAction = z.infer<typeof adminAdvertisingInventoryActionSchema>;
type KillSwitchAction = z.infer<typeof adminAdvertisingKillSwitchActionSchema>;

export async function manageAdvertisingInquiry({
  action,
  adminAccountId,
  client,
}: {
  action: InquiryAction;
  adminAccountId: string;
  client: SupabaseClient;
}) {
  return client.rpc("admin_manage_advertising_inquiry", {
    target_admin_account_id: adminAccountId,
    target_assigned_admin_account_id: adminAccountId,
    target_inquiry_id: action.inquiryId,
    target_next_action_at: action.nextActionAt,
    target_priority: action.priority,
    target_reason: action.reason,
    target_status: action.status,
  });
}

export async function manageAdvertisingCampaign({
  action,
  adminAccountId,
  client,
}: {
  action: CampaignAction;
  adminAccountId: string;
  client: SupabaseClient;
}) {
  return client.rpc("admin_manage_advertising_campaign", {
    target_admin_account_id: adminAccountId,
    target_campaign_id: action.campaignId,
    target_reason: action.reason,
    target_status: action.status,
  });
}

export async function upsertAdvertisingCampaign({
  action,
  adminAccountId,
  client,
}: {
  action: CampaignWrite;
  adminAccountId: string;
  client: SupabaseClient;
}) {
  return client.rpc("admin_upsert_advertising_campaign", {
    target_admin_account_id: adminAccountId,
    target_budget_note: action.budgetNote,
    target_campaign_id: action.campaignId,
    target_ends_at: action.endsAt,
    target_inquiry_id: action.inquiryId,
    target_name: action.name,
    target_objective: action.objective,
    target_placement_keys: action.placementKeys,
    target_policy_version: action.policyVersion,
    target_provider: action.provider,
    target_reason: action.reason,
    target_starts_at: action.startsAt,
  });
}

export async function manageAdvertisingCreative({
  action,
  adminAccountId,
  client,
}: {
  action: CreativeAction;
  adminAccountId: string;
  client: SupabaseClient;
}) {
  return client.rpc("admin_manage_advertising_creative", {
    target_admin_account_id: adminAccountId,
    target_creative_id: action.creativeId,
    target_reason: action.reason,
    target_review_status: action.reviewStatus,
  });
}

export async function upsertAdvertisingCreative({
  action,
  adminAccountId,
  client,
}: {
  action: CreativeWrite;
  adminAccountId: string;
  client: SupabaseClient;
}) {
  return client.rpc("admin_upsert_advertising_creative", {
    target_admin_account_id: adminAccountId,
    target_alt_text: action.altText,
    target_campaign_id: action.campaignId,
    target_creative_id: action.creativeId,
    target_description: action.description,
    target_destination_url: action.destinationUrl,
    target_disclosure_text: action.disclosureText,
    target_expires_at: action.expiresAt,
    target_fact_checked_at: action.factCheckedAt,
    target_image_url: action.imageUrl,
    target_provider: action.provider,
    target_reason: action.reason,
    target_title: action.title,
  });
}

export async function manageAdvertisingInventory({
  action,
  adminAccountId,
  client,
}: {
  action: InventoryAction;
  adminAccountId: string;
  client: SupabaseClient;
}) {
  return client.rpc("admin_manage_advertising_inventory", {
    target_active_from: action.activeFrom,
    target_active_until: action.activeUntil,
    target_admin_account_id: adminAccountId,
    target_daily_cap: action.dailyCap,
    target_is_active: action.isActive,
    target_minimum_interval_seconds: action.minimumIntervalSeconds,
    target_minimum_organic_count: action.minimumOrganicCount,
    target_placement_key: action.placementKey,
    target_reason: action.reason,
    target_rollout_percentage: action.rolloutPercentage,
    target_session_cap: action.sessionCap,
  });
}

export async function toggleAdvertisingKillSwitch({
  action,
  adminAccountId,
  client,
}: {
  action: KillSwitchAction;
  adminAccountId: string;
  client: SupabaseClient;
}) {
  return client.rpc("admin_toggle_advertising_kill_switch", {
    target_admin_account_id: adminAccountId,
    target_key: action.key,
    target_reason: action.reason,
    target_scope: action.scope,
    target_suspended: action.suspended,
  });
}

export function advertisingAdminActionError(
  error: { code?: string; message?: string } | null,
) {
  if (!error) return null;
  const unavailable = [
    "42P01",
    "42883",
    "PGRST202",
    "PGRST204",
    "PGRST205",
  ].includes(error.code ?? "");
  return {
    message: unavailable
      ? "광고 운영 기능을 준비해야 합니다. 최신 데이터베이스 마이그레이션을 확인해 주세요."
      : "현재 상태에서는 변경할 수 없습니다. 새로고침 후 다시 확인해 주세요.",
    status: unavailable ? 503 : 409,
  };
}
