import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type ProductAnalyticsArea,
  productAnalyticsAreas,
} from "@/features/consent/optional-consent-contract";

export const adminProductAnalyticsWindows = [7, 30, 90] as const;
export type AdminProductAnalyticsWindow =
  (typeof adminProductAnalyticsWindows)[number];

export type AdminProductAnalyticsSnapshot = {
  areas: Array<{
    area: ProductAnalyticsArea;
    uniqueAccounts: number;
    views: number;
  }>;
  daily: Array<{
    day: string;
    uniqueAccounts: number;
    views: number;
  }>;
  generatedAt: string;
  retentionDays: number;
  summary: {
    activatedAccounts: number;
    activeAccounts: number;
    assessmentViewers: number;
    bugFeedbackCount: number;
    comparedAccounts: number;
    completedAccounts: number;
    completedAttempts: number;
    eligibleAccounts: number;
    ideaFeedbackCount: number;
    lastEventAt: string | null;
    newEligibleAccounts: number;
    repeatAccounts: number;
    resultDependsCount: number;
    resultFeedbackCount: number;
    resultFitCount: number;
    resultNotFitCount: number;
    resultViewers: number;
    sharedAccounts: number;
    totalScreenViews: number;
    usabilityFeedbackCount: number;
  };
  windowDays: AdminProductAnalyticsWindow;
};

export async function readAdminProductAnalytics({
  accountId,
  client,
  windowDays,
}: {
  accountId: string;
  client: SupabaseClient;
  windowDays: AdminProductAnalyticsWindow;
}): Promise<
  | { available: true; snapshot: AdminProductAnalyticsSnapshot }
  | { available: false; snapshot: null }
> {
  const response = await client.schema("consent").rpc(
    "admin_product_analytics_snapshot",
    {
      target_admin_account_id: accountId,
      target_days: windowDays,
    },
  );

  if (response.error) return { available: false, snapshot: null };
  const snapshot = parseAdminProductAnalyticsSnapshot(response.data);
  return snapshot && snapshot.windowDays === windowDays
    ? { available: true, snapshot }
    : { available: false, snapshot: null };
}

export function parseAdminProductAnalyticsWindow(
  value: string | undefined,
): AdminProductAnalyticsWindow {
  const parsed = Number(value);
  return adminProductAnalyticsWindows.includes(
    parsed as AdminProductAnalyticsWindow,
  )
    ? (parsed as AdminProductAnalyticsWindow)
    : 30;
}

export function parseAdminProductAnalyticsSnapshot(
  value: unknown,
): AdminProductAnalyticsSnapshot | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  const windowDays = readAnalyticsWindow(value.windowDays);
  const generatedAt = readDateTime(value.generatedAt);
  const retentionDays = readCount(value.retentionDays);
  const summary = isRecord(value.summary) ? value.summary : null;
  if (!windowDays || !generatedAt || retentionDays === null || !summary) {
    return null;
  }

  const parsedSummary = {
    activatedAccounts: readCount(summary.activatedAccounts),
    activeAccounts: readCount(summary.activeAccounts),
    assessmentViewers: readCount(summary.assessmentViewers),
    bugFeedbackCount: readCount(summary.bugFeedbackCount),
    comparedAccounts: readCount(summary.comparedAccounts),
    completedAccounts: readCount(summary.completedAccounts),
    completedAttempts: readCount(summary.completedAttempts),
    eligibleAccounts: readCount(summary.eligibleAccounts),
    ideaFeedbackCount: readCount(summary.ideaFeedbackCount),
    newEligibleAccounts: readCount(summary.newEligibleAccounts),
    repeatAccounts: readCount(summary.repeatAccounts),
    resultDependsCount: readCount(summary.resultDependsCount),
    resultFeedbackCount: readCount(summary.resultFeedbackCount),
    resultFitCount: readCount(summary.resultFitCount),
    resultNotFitCount: readCount(summary.resultNotFitCount),
    resultViewers: readCount(summary.resultViewers),
    sharedAccounts: readCount(summary.sharedAccounts),
    totalScreenViews: readCount(summary.totalScreenViews),
    usabilityFeedbackCount: readCount(summary.usabilityFeedbackCount),
  };
  if (Object.values(parsedSummary).some((item) => item === null)) return null;

  const areas = parseAreas(value.areas);
  const daily = parseDaily(value.daily, windowDays);
  if (!areas || !daily) return null;

  const lastEventAt =
    summary.lastEventAt === null ? null : readDateTime(summary.lastEventAt);
  if (summary.lastEventAt !== null && !lastEventAt) return null;

  return {
    areas,
    daily,
    generatedAt,
    retentionDays,
    summary: {
      activatedAccounts: parsedSummary.activatedAccounts as number,
      activeAccounts: parsedSummary.activeAccounts as number,
      assessmentViewers: parsedSummary.assessmentViewers as number,
      bugFeedbackCount: parsedSummary.bugFeedbackCount as number,
      comparedAccounts: parsedSummary.comparedAccounts as number,
      completedAccounts: parsedSummary.completedAccounts as number,
      completedAttempts: parsedSummary.completedAttempts as number,
      eligibleAccounts: parsedSummary.eligibleAccounts as number,
      ideaFeedbackCount: parsedSummary.ideaFeedbackCount as number,
      lastEventAt,
      newEligibleAccounts: parsedSummary.newEligibleAccounts as number,
      repeatAccounts: parsedSummary.repeatAccounts as number,
      resultDependsCount: parsedSummary.resultDependsCount as number,
      resultFeedbackCount: parsedSummary.resultFeedbackCount as number,
      resultFitCount: parsedSummary.resultFitCount as number,
      resultNotFitCount: parsedSummary.resultNotFitCount as number,
      resultViewers: parsedSummary.resultViewers as number,
      sharedAccounts: parsedSummary.sharedAccounts as number,
      totalScreenViews: parsedSummary.totalScreenViews as number,
      usabilityFeedbackCount: parsedSummary.usabilityFeedbackCount as number,
    },
    windowDays,
  };
}

function parseAreas(value: unknown) {
  if (!Array.isArray(value) || value.length > productAnalyticsAreas.length) {
    return null;
  }
  const seen = new Set<string>();
  const areas: AdminProductAnalyticsSnapshot["areas"] = [];
  for (const item of value) {
    if (!isRecord(item) || !isProductAnalyticsArea(item.area)) return null;
    const uniqueAccounts = readCount(item.uniqueAccounts);
    const views = readCount(item.views);
    if (uniqueAccounts === null || views === null || seen.has(item.area)) {
      return null;
    }
    seen.add(item.area);
    areas.push({ area: item.area, uniqueAccounts, views });
  }
  return areas;
}

function parseDaily(value: unknown, windowDays: AdminProductAnalyticsWindow) {
  if (!Array.isArray(value) || value.length > windowDays) return null;
  const seen = new Set<string>();
  const daily: AdminProductAnalyticsSnapshot["daily"] = [];
  for (const item of value) {
    const day = isRecord(item) ? String(item.day) : "";
    if (!isRecord(item) || !/^\d{4}-\d{2}-\d{2}$/.test(day) || seen.has(day)) {
      return null;
    }
    const uniqueAccounts = readCount(item.uniqueAccounts);
    const views = readCount(item.views);
    if (uniqueAccounts === null || views === null) return null;
    seen.add(day);
    daily.push({ day, uniqueAccounts, views });
  }
  return daily;
}

function readAnalyticsWindow(value: unknown) {
  return adminProductAnalyticsWindows.includes(
    value as AdminProductAnalyticsWindow,
  )
    ? (value as AdminProductAnalyticsWindow)
    : null;
}

function readCount(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readDateTime(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return value;
}

function isProductAnalyticsArea(value: unknown): value is ProductAnalyticsArea {
  return productAnalyticsAreas.includes(value as ProductAnalyticsArea);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
