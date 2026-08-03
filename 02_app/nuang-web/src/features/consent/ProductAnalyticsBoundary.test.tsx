import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProductAnalyticsBoundary,
  resolveProductAnalyticsArea,
} from "./ProductAnalyticsBoundary";

const { pathname } = vi.hoisted(() => ({ pathname: { value: "/home" } }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

describe("ProductAnalyticsBoundary", () => {
  beforeEach(() => {
    pathname.value = "/home";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 201 })));
  });

  it("sends only the normalized product area", async () => {
    pathname.value = "/assessments/topics/apology-style/result/topic-secret";
    render(<ProductAnalyticsBoundary />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      area: "result",
      eventName: "screen_view",
    });
    expect(String(init?.body)).not.toContain("topic-secret");
  });

  it("does not send events from login, onboarding, policies, or admin", () => {
    pathname.value = "/login";
    render(<ProductAnalyticsBoundary />);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("resolveProductAnalyticsArea", () => {
  it.each([
    ["/home", "home"],
    ["/assessments/nu-core-quick", "assessment"],
    ["/results/account/123", "result"],
    ["/assessments/topics/hurt/result/123", "result"],
    ["/community", "community"],
    ["/trait-map/ENAKQ", "trait_map"],
    ["/my", "my"],
    ["/my/settings/notifications", "settings"],
    ["/assessments/together/balance-game", "together"],
  ])("maps %s to %s", (value, expected) => {
    expect(resolveProductAnalyticsArea(value)).toBe(expected);
  });

  it("ignores non-product and sensitive routing surfaces", () => {
    expect(resolveProductAnalyticsArea("/login")).toBeNull();
    expect(resolveProductAnalyticsArea("/admin/members")).toBeNull();
    expect(resolveProductAnalyticsArea("/auth/callback")).toBeNull();
  });
});
