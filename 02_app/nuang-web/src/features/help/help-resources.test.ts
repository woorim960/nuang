import { describe, expect, it } from "vitest";
import {
  helpBoundaries,
  helpPrivacyNotice,
  helpResources,
  sourceLinks,
  urgentCallActions,
  urgentSteps,
} from "@/features/help/help-resources";

describe("help resources", () => {
  it("keeps urgent guidance focused on immediate external help", () => {
    const urgentText = urgentSteps.join(" ");
    const urgentPhones = urgentCallActions.map((action) => action.label);

    expect(urgentText).toContain("119");
    expect(urgentText).toContain("112");
    expect(urgentPhones).toEqual(["109", "119", "112"]);
    urgentCallActions.forEach((action) => {
      expect(action.href).toMatch(/^tel:/);
      expect(action.ariaLabel).toContain(action.label);
    });
  });

  it("keeps every help resource connected to a phone or official guide", () => {
    helpResources.forEach((resource) => {
      expect(resource.title.length).toBeGreaterThan(1);
      expect(resource.summary.length).toBeGreaterThan(20);
      expect(resource.fit.length).toBeGreaterThanOrEqual(3);
      expect(Boolean(resource.phone || resource.href)).toBe(true);

      if (resource.phone) {
        expect(resource.phone).toMatch(/^[0-9-]+$/);
      }
      if (resource.href) {
        expect(resource.href).toMatch(/^https:\/\//);
      }
    });
  });

  it("states that high-risk topics are not scored, diagnosed, corrected, or saved by NUANG", () => {
    const boundaryText = `${helpBoundaries.join(" ")} ${helpPrivacyNotice}`;

    [
      "점수화하지 않아요",
      "진단이나 치료가 아니라",
      "치료 테스트를 만들지 않아요",
      "계정이나 결과에 저장하지 않아요",
      "성향지도",
      "비교 리포트",
    ].forEach((phrase) => {
      expect(boundaryText).toContain(phrase);
    });
  });

  it("uses official external source links only", () => {
    expect(sourceLinks.length).toBeGreaterThanOrEqual(4);
    sourceLinks.forEach((source) => {
      expect(source.href).toMatch(/^https:\/\//);
    });
  });
});
