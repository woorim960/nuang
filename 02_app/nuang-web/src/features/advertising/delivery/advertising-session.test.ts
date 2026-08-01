import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canRequestAdvertising,
  recordAdvertisingImpression,
  suppressAdvertisingProvider,
} from "./advertising-session";

describe("advertising session caps", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        get length() {
          return values.size;
        },
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("allows a configured placement once and then respects its session cap", () => {
    expect(
      canRequestAdvertising({
        dailyCap: 2,
        placementKey: "FEED_COMMERCE_01",
        provider: "coupang",
        sessionCap: 1,
      }),
    ).toBe(true);

    recordAdvertisingImpression({
      placementKey: "FEED_COMMERCE_01",
      provider: "coupang",
    });

    expect(
      canRequestAdvertising({
        dailyCap: 2,
        placementKey: "FEED_COMMERCE_01",
        provider: "coupang",
        sessionCap: 1,
      }),
    ).toBe(false);
  });

  it("preserves the daily cap when inactivity starts a new session", () => {
    recordAdvertisingImpression({
      placementKey: "HOME_INLINE_01",
      provider: "adsense",
    });
    vi.advanceTimersByTime(31 * 60 * 1_000);

    expect(
      canRequestAdvertising({
        dailyCap: 1,
        placementKey: "HOME_INLINE_01",
        provider: "adsense",
        sessionCap: 1,
      }),
    ).toBe(false);
  });

  it("suppresses a provider locally without affecting app behavior", () => {
    suppressAdvertisingProvider("adsense");
    expect(
      canRequestAdvertising({
        placementKey: "HOME_INLINE_01",
        provider: "adsense",
      }),
    ).toBe(false);
    expect(
      canRequestAdvertising({
        placementKey: "FEED_COMMERCE_01",
        provider: "coupang",
      }),
    ).toBe(true);
  });
});
