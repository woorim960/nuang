import { describe, expect, it } from "vitest";
import {
  assessmentHubFilters,
  canAccessTopicAssessmentRoute,
  isTopicAssessmentPublished,
  labAssessmentCatalog,
  publishedAssessmentCatalog,
  topicAssessmentCatalog,
} from "@/features/assessment/assessment-catalog";

describe("assessment catalog publication", () => {
  it("keeps discovery navigation small and distinct", () => {
    expect(assessmentHubFilters.map((item) => item.id)).toEqual([
      "recommended",
      "self",
      "together",
      "lab",
    ]);
  });

  it("publishes the approved and production-complete topic assessments", () => {
    expect(topicAssessmentCatalog).not.toHaveLength(0);
    const publishedTopics = topicAssessmentCatalog.filter(
      (item) => item.publicationStatus === "published",
    );

    expect(publishedTopics.map((item) => item.id).sort()).toEqual([
      "topic:apology-style",
      "topic:comfort-style",
      "topic:focus-switch",
      "topic:hurt-expression",
      "topic:organizing-style",
      "topic:recharge-routine",
    ]);
    expect(
      publishedTopics.find((item) => item.id === "topic:comfort-style"),
    ).toMatchObject({
      lifecycle: "released",
      publicationStatus: "published",
    });
    expect(
      publishedTopics.find((item) => item.id === "topic:apology-style"),
    ).toMatchObject({
      lifecycle: "pilot",
      publicationStatus: "published",
    });
    expect(
      publishedTopics.find((item) => item.id === "topic:focus-switch"),
    ).toMatchObject({
      lifecycle: "pilot",
      publicationStatus: "published",
    });
    expect(
      publishedTopics.find((item) => item.id === "topic:organizing-style"),
    ).toMatchObject({
      lifecycle: "pilot",
      publicationStatus: "published",
    });
    expect(
      publishedTopics.find((item) => item.id === "topic:hurt-expression"),
    ).toMatchObject({
      lifecycle: "pilot",
      publicationStatus: "published",
    });
    expect(
      publishedTopics.find((item) => item.id === "topic:recharge-routine"),
    ).toMatchObject({
      lifecycle: "pilot",
      publicationStatus: "published",
    });
    expect(
      topicAssessmentCatalog
        .filter(
          (item) =>
            item.id !== "topic:comfort-style" &&
            item.id !== "topic:apology-style" &&
            item.id !== "topic:focus-switch" &&
            item.id !== "topic:hurt-expression" &&
            item.id !== "topic:organizing-style" &&
            item.id !== "topic:recharge-routine",
        )
        .every(
          (item) =>
            item.lifecycle === "research_only" &&
            item.publicationStatus === "paused",
        ),
    ).toBe(true);
    expect(
      publishedAssessmentCatalog.some(
        (item) => item.id === "topic:comfort-style",
      ),
    ).toBe(true);
  });

  it("publishes lab content only with play semantics", () => {
    expect(labAssessmentCatalog).not.toHaveLength(0);
    expect(
      labAssessmentCatalog.every(
        (item) =>
          item.intendedUse === "play" &&
          item.resultPolicy === "play_only" &&
          item.lifecycle === "pilot" &&
          item.publicationStatus === "published",
      ),
    ).toBe(true);
  });

  it("keeps unfinished topic assessments out of production publication", () => {
    expect(isTopicAssessmentPublished("recharge-routine")).toBe(true);
    expect(isTopicAssessmentPublished("focus-switch")).toBe(true);
    expect(isTopicAssessmentPublished("organizing-style")).toBe(true);
    expect(isTopicAssessmentPublished("comfort-style")).toBe(true);
    expect(isTopicAssessmentPublished("apology-style")).toBe(true);
    expect(isTopicAssessmentPublished("hurt-expression")).toBe(true);
    expect(canAccessTopicAssessmentRoute("recharge-routine")).toBe(true);
    expect(canAccessTopicAssessmentRoute("unknown-topic")).toBe(false);
  });
});
