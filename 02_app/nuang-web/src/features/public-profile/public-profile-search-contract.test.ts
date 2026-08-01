import { describe, expect, it } from "vitest";
import {
  normalizePublicProfileSearchQuery,
  publicProfileSearchMaxQueryLength,
} from "@/features/public-profile/public-profile-search-contract";

describe("public profile search contract", () => {
  it("normalizes a handle while preserving Korean role searches", () => {
    expect(normalizePublicProfileSearchQuery("  @Summer.Day ")).toEqual({
      ok: true,
      value: "Summer.Day",
    });
    expect(normalizePublicProfileSearchQuery("관계를 여는 선도자")).toEqual({
      ok: true,
      value: "관계를 여는 선도자",
    });
  });

  it("rejects short, oversized, and filter-control input", () => {
    expect(normalizePublicProfileSearchQuery("E")).toEqual({
      code: "too_short",
      ok: false,
    });
    expect(
      normalizePublicProfileSearchQuery(
        "가".repeat(publicProfileSearchMaxQueryLength + 1),
      ),
    ).toEqual({ code: "too_long", ok: false });
    expect(normalizePublicProfileSearchQuery("여름,eq.active")).toEqual({
      code: "invalid",
      ok: false,
    });
  });
});
