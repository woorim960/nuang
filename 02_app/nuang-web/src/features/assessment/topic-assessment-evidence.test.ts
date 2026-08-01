import { describe, expect, it } from "vitest";
import { getTopicAssessmentEvidence } from "./topic-assessment-evidence";

describe("topic assessment research evidence", () => {
  it.each([
    ["comfort-style", 8],
    ["apology-style", 6],
    ["hurt-expression", 6],
    ["recharge-routine", 8],
    ["focus-switch", 9],
    ["organizing-style", 8],
  ])("keeps a substantial source set for %s", (slug, minimum) => {
    const evidence = getTopicAssessmentEvidence(slug);
    expect(evidence).not.toBeNull();
    expect(evidence?.sources.length).toBeGreaterThanOrEqual(minimum);
    expect(evidence?.principles.length).toBeGreaterThanOrEqual(3);
    evidence?.sources.forEach((source) => {
      expect(source.href).toMatch(/^https:\/\/doi\.org\//);
      expect(source.focus.length).toBeGreaterThan(15);
    });
  });
});
