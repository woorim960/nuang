"use client";

import {
  markOnboardingCompleted,
  markOnboardingSeen,
  readOnboardingExperience,
} from "@/features/onboarding/onboarding-storage";

type ServerOnboardingState = {
  completedAt: string | null;
  firstSeenAt: string | null;
  guideVersion: number;
  seen: boolean;
};

export async function resolveHasSeenOnboarding() {
  const local = readLocalExperience();
  if (local) {
    void persistOnboardingState(local.completedAt ? "completed" : "seen");
    return true;
  }

  try {
    const response = await fetch("/api/me/onboarding", {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return false;

    const payload = (await response.json()) as {
      ok?: boolean;
      state?: ServerOnboardingState;
    };
    if (payload.ok !== true || payload.state?.seen !== true) return false;

    const firstSeenAt = parseDate(payload.state.firstSeenAt) ?? new Date();
    markOnboardingSeen(window.localStorage, firstSeenAt);
    const completedAt = parseDate(payload.state.completedAt);
    if (completedAt) {
      markOnboardingCompleted(window.localStorage, completedAt);
    }
    return true;
  } catch {
    return false;
  }
}

export function recordOnboardingSeen() {
  try {
    markOnboardingSeen();
  } catch {
    // A blocked browser store must not block the product journey.
  }
  void persistOnboardingState("seen");
}

export function recordOnboardingCompleted() {
  try {
    markOnboardingCompleted();
  } catch {
    // A blocked browser store must not block the product journey.
  }
  void persistOnboardingState("completed");
}

function readLocalExperience() {
  try {
    return readOnboardingExperience();
  } catch {
    return null;
  }
}

async function persistOnboardingState(state: "completed" | "seen") {
  try {
    await fetch("/api/me/onboarding", {
      body: JSON.stringify({ state }),
      cache: "no-store",
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "PATCH",
    });
  } catch {
    // Cross-device sync is best-effort and never blocks navigation.
  }
}

function parseDate(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value);
}
