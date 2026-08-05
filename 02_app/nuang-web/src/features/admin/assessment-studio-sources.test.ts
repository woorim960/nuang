import { describe, expect, it } from "vitest";

import { getBuiltinAssessmentStudioEntries } from "./assessment-studio-sources";

describe("assessment studio builtin inventory", () => {
  it("contains every current assessment family without duplicate source keys", () => {
    const entries = getBuiltinAssessmentStudioEntries();
    const keys = entries.map((entry) => entry.sourceKey);

    expect(new Set(keys).size).toBe(keys.length);
    expect(entries.filter((entry) => entry.subtype === "core_quick")).toHaveLength(1);
    expect(entries.filter((entry) => entry.subtype === "core_precision")).toHaveLength(1);
    expect(entries.filter((entry) => entry.subtype === "free_topic")).toHaveLength(19);
    expect(entries.filter((entry) => entry.subtype === "odd_lab")).toHaveLength(3);
    expect(entries.filter((entry) => entry.subtype === "balance_pack")).toHaveLength(8);
    expect(entries.filter((entry) => entry.subtype === "friend_match")).toHaveLength(1);
  });

  it("keeps every currently published builtin free of publication blockers", () => {
    const blocked = getBuiltinAssessmentStudioEntries()
      .filter((entry) => entry.status === "published")
      .flatMap((entry) =>
        entry.validationIssues
          .filter((issue) => issue.severity === "blocker")
          .map((issue) => `${entry.sourceKey}:${issue.code}:${issue.message}`),
      );

    expect(blocked).toEqual([]);
  });
});
