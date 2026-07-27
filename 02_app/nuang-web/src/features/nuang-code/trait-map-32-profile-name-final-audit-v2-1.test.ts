import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map 32-profile name final audit v2.1", () => {
  it("audits 32 unique short and display names", () => {
    expect(report.profiles).toHaveLength(32);
    expect(
      new Set(
        report.profiles.map(
          (profile: { shortName: string }) => profile.shortName,
        ),
      ).size,
    ).toBe(32);
    expect(
      new Set(
        report.profiles.map(
          (profile: { displayName: string }) => profile.displayName,
        ),
      ).size,
    ).toBe(32);
    expect(Object.values(report.globalChecks).every(Boolean)).toBe(true);
  });

  it("records all deliberate v2.1 naming changes", () => {
    const changed = report.profiles.filter(
      (profile: { decision: string }) => profile.decision !== "retain",
    );
    expect(changed.map((profile: { code: string }) => profile.code)).toEqual([
      "ERGKQ",
      "INGKQ",
      "IRGKQ",
      "IRGMQ",
    ]);
    expect(report.summary.retainedNames).toBe(28);
    expect(report.summary.displayNamesChanged).toBe(4);
    expect(report.summary.shortNamesChanged).toBe(1);
  });

  it("removes prediction and guaranteed-risk implications", () => {
    const allNames = report.profiles
      .flatMap((profile: { shortName: string; displayName: string }) => [
        profile.shortName,
        profile.displayName,
      ])
      .join(" ");
    expect(allNames).not.toMatch(/예측가|위험을 미리|문제를 빠르게 푸는/);
    expect(
      report.profiles.find(
        (profile: { code: string }) => profile.code === "INGKQ",
      ),
    ).toMatchObject({
      shortName: "구상가",
      displayName: "가능성과 변수를 살피는 구상가",
    });
  });

  it("keeps role names candidate-only until user validation", () => {
    expect(report.summary.userValidatedNames).toBe(0);
    expect(report.summary.customerApprovedNames).toBe(0);
    for (const profile of report.profiles) {
      expect(profile.userValidationState).toBe("not_started");
      expect(profile.publicationState).toBe("candidate_only");
    }
  });
});
