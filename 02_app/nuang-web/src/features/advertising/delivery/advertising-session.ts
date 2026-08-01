"use client";

import type {
  AdvertisingPlacementKey,
  AdvertisingProvider,
} from "./advertising-delivery-contract";

const storageKey = "nuang:advertising-session:v1";
const inactivityWindowMs = 30 * 60 * 1_000;
const dailyWindowMs = 24 * 60 * 60 * 1_000;

type Impression = {
  creativeId?: string;
  occurredAt: number;
  placementKey: AdvertisingPlacementKey;
  provider: AdvertisingProvider;
};

type AdvertisingSessionState = {
  impressions: Impression[];
  lastActiveAt: number;
  sessionId: string;
  sessionStartedAt: number;
  suppressedProviders: AdvertisingProvider[];
};

export function canRequestAdvertising({
  creativeId,
  dailyCap = 6,
  placementKey,
  provider,
  sessionCap = 3,
}: {
  creativeId?: string;
  dailyCap?: number;
  placementKey: AdvertisingPlacementKey;
  provider: AdvertisingProvider;
  sessionCap?: number;
}) {
  const now = Date.now();
  const state = readState(now);
  writeState({ ...state, lastActiveAt: now });

  if (state.suppressedProviders.includes(provider)) return false;

  const currentSession = state.impressions.filter(
    (item) => item.occurredAt >= state.sessionStartedAt,
  );
  const daily = state.impressions.filter(
    (item) => item.occurredAt >= now - dailyWindowMs,
  );

  if (currentSession.length >= 3 || daily.length >= 6) return false;
  const placementSessionCount = currentSession.filter(
    (item) =>
      item.provider === provider && item.placementKey === placementKey,
  ).length;
  const placementDailyCount = daily.filter(
    (item) =>
      item.provider === provider && item.placementKey === placementKey,
  ).length;
  if (
    placementSessionCount >= Math.max(0, sessionCap) ||
    placementDailyCount >= Math.max(0, dailyCap)
  ) {
    return false;
  }
  if (
    placementSessionCount > 0
  ) {
    return false;
  }

  if (
    creativeId &&
    daily.filter((item) => item.creativeId === creativeId).length >= 2
  ) {
    return false;
  }

  const latest = [...currentSession].sort(
    (left, right) => right.occurredAt - left.occurredAt,
  )[0];
  if (latest && now - latest.occurredAt < 3 * 60 * 1_000) return false;

  return true;
}

export function recordAdvertisingImpression({
  creativeId,
  placementKey,
  provider,
}: {
  creativeId?: string;
  placementKey: AdvertisingPlacementKey;
  provider: AdvertisingProvider;
}) {
  const now = Date.now();
  const state = readState(now);
  const duplicate = state.impressions.some(
    (item) =>
      item.placementKey === placementKey &&
      item.provider === provider &&
      item.occurredAt >= state.sessionStartedAt,
  );
  if (duplicate) return;

  writeState({
    ...state,
    impressions: [
      ...state.impressions.filter(
        (item) => item.occurredAt >= now - dailyWindowMs,
      ),
      { creativeId, occurredAt: now, placementKey, provider },
    ],
    lastActiveAt: now,
  });
}

export function suppressAdvertisingProvider(provider: AdvertisingProvider) {
  const now = Date.now();
  const state = readState(now);
  writeState({
    ...state,
    lastActiveAt: now,
    suppressedProviders: [...new Set([...state.suppressedProviders, provider])],
  });
}

function readState(now: number): AdvertisingSessionState {
  const fallback = createState(now);
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as
      | Partial<AdvertisingSessionState>
      | null;
    if (!parsed || typeof parsed.lastActiveAt !== "number") return fallback;
    if (now - parsed.lastActiveAt >= inactivityWindowMs) {
      return {
        ...fallback,
        impressions: Array.isArray(parsed.impressions)
          ? parsed.impressions
              .filter(isImpression)
              .filter((item) => item.occurredAt >= now - dailyWindowMs)
          : [],
      };
    }

    return {
      impressions: Array.isArray(parsed.impressions)
        ? parsed.impressions.filter(isImpression)
        : [],
      lastActiveAt: parsed.lastActiveAt,
      sessionId:
        typeof parsed.sessionId === "string" ? parsed.sessionId : createId(),
      sessionStartedAt:
        typeof parsed.sessionStartedAt === "number"
          ? parsed.sessionStartedAt
          : now,
      suppressedProviders: Array.isArray(parsed.suppressedProviders)
        ? parsed.suppressedProviders.filter(isProvider)
        : [],
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return fallback;
  }
}

function writeState(state: AdvertisingSessionState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Advertising is optional. Storage restrictions must not affect the app.
  }
}

function createState(now: number): AdvertisingSessionState {
  return {
    impressions: [],
    lastActiveAt: now,
    sessionId: createId(),
    sessionStartedAt: now,
    suppressedProviders: [],
  };
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isProvider(value: unknown): value is AdvertisingProvider {
  return value === "adsense" || value === "coupang";
}

function isImpression(value: unknown): value is Impression {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Impression>;
  return (
    typeof item.occurredAt === "number" &&
    (item.placementKey === "HOME_INLINE_01" ||
      item.placementKey === "FEED_COMMERCE_01") &&
    isProvider(item.provider)
  );
}
