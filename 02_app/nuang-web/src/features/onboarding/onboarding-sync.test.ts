import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  recordOnboardingCompleted,
  recordOnboardingSeen,
  resolveHasSeenOnboarding,
} from "@/features/onboarding/onboarding-sync";
import {
  onboardingEntryContract,
  readOnboardingExperience,
} from "@/features/onboarding/onboarding-storage";

describe("onboarding account sync", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() {
          return values.size;
        },
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      } satisfies Storage,
    });
  });

  it("hydrates a signed-in account state onto a new device", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          state: {
            completedAt: "2026-08-03T00:02:00.000Z",
            firstSeenAt: "2026-08-03T00:00:00.000Z",
            guideVersion: 3,
            seen: true,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await resolveHasSeenOnboarding()).toBe(true);
    expect(readOnboardingExperience()).toEqual({
      completedAt: "2026-08-03T00:02:00.000Z",
      firstSeenAt: "2026-08-03T00:00:00.000Z",
      lastSeenGuideVersion: onboardingEntryContract.guideVersion,
    });
  });

  it("keeps a first-time anonymous visitor eligible for onboarding", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, state: { seen: false } }),
          { status: 200 },
        ),
      ),
    );

    expect(await resolveHasSeenOnboarding()).toBe(false);
  });

  it("records first exposure locally and attempts best-effort account sync", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    recordOnboardingSeen();

    expect(readOnboardingExperience()?.completedAt).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/onboarding",
      expect.objectContaining({
        body: JSON.stringify({ state: "seen" }),
        method: "PATCH",
      }),
    );
  });

  it("records completion without replacing the earlier first-seen time", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    );
    recordOnboardingSeen();
    const firstSeenAt = readOnboardingExperience()?.firstSeenAt;

    recordOnboardingCompleted();

    expect(readOnboardingExperience()?.firstSeenAt).toBe(firstSeenAt);
    expect(readOnboardingExperience()?.completedAt).not.toBeNull();
  });
});
