import { describe, expect, it } from "vitest";
import {
  getDefaultOriginalProfileReportVisibility,
  resolveOriginalProfileReportVisibility,
} from "@/features/public-profile/server-profile-reports";

describe("original profile report default visibility", () => {
  it("publishes every regular report summary when no explicit visibility row exists", () => {
    expect(getDefaultOriginalProfileReportVisibility("core", "full")).toBe(
      "profile_public",
    );
    expect(getDefaultOriginalProfileReportVisibility("core", "quick")).toBe(
      "profile_public",
    );
    expect(getDefaultOriginalProfileReportVisibility("topic")).toBe(
      "profile_public",
    );
    expect(getDefaultOriginalProfileReportVisibility("lab")).toBe(
      "profile_public",
    );
  });

  it("keeps explicit privacy and fails closed when visibility cannot be read", () => {
    expect(resolveOriginalProfileReportVisibility("private", "topic")).toBe(
      "private",
    );
    expect(resolveOriginalProfileReportVisibility("missing", "topic")).toBe(
      "profile_public",
    );
    expect(resolveOriginalProfileReportVisibility("unavailable", "topic")).toBe(
      "private",
    );
  });
});
