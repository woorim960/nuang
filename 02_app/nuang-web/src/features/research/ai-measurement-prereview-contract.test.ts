import { describe, expect, it } from "vitest";
import {
  aiMeasurementPrereviewStatuses,
  aiMeasurementPrereviewTracks,
  initialAiMeasurementPrereviewRecords,
  summarizeAiMeasurementPrereview,
  validateAiMeasurementPrereviewRecord,
  type AiMeasurementPrereviewRecord,
} from "./ai-measurement-prereview-contract";

describe("AI measurement prereview contract", () => {
  it("mirrors every human validation track without using approval states", () => {
    expect(
      aiMeasurementPrereviewTracks.map((track) => track.humanGate),
    ).toEqual([
      "cognitiveReview",
      "fairnessAndInvariance",
      "quantitativePilot",
      "reliabilityAndStructure",
    ]);
    expect(aiMeasurementPrereviewStatuses.join(" ")).not.toMatch(
      /passed|approved|validated|active/,
    );
  });

  it("requires auditable checklists, artifacts, and an explicit limitation per track", () => {
    for (const track of aiMeasurementPrereviewTracks) {
      expect(track.checklistFields.length).toBeGreaterThanOrEqual(12);
      expect(track.artifactFiles).toContain("packet_manifest.json");
      expect(track.artifactFiles).toContain("human_handoff.md");
      expect(track.limitation).toMatch(/않|없|못/);
    }
  });

  it("calls clean AI completion human-handoff readiness, never a human gate pass", () => {
    const completed = initialAiMeasurementPrereviewRecords.map(
      (record): AiMeasurementPrereviewRecord => ({
        ...record,
        artifactManifestSha256: "a".repeat(64),
        completedAt: "2026-08-05T00:00:00.000Z",
        runIds: [`${record.trackId}-run-1`],
        status: "completed_no_blockers",
      }),
    );

    expect(summarizeAiMeasurementPrereview(completed)).toEqual({
      canChangeHumanValidationGate: false,
      humanGateEffect: "none",
      label: "사람 검토 준비",
      state: "human_handoff_ready",
    });
  });

  it("keeps a single minority blocker visible instead of averaging it away", () => {
    const records = initialAiMeasurementPrereviewRecords.map(
      (record, index): AiMeasurementPrereviewRecord => ({
        ...record,
        status:
          index === 0
            ? "completed_with_blockers"
            : "completed_no_blockers",
      }),
    );

    expect(summarizeAiMeasurementPrereview(records)).toMatchObject({
      canChangeHumanValidationGate: false,
      label: "차단 항목 확인 필요",
      state: "blocked",
    });
  });

  it("refuses human handoff readiness without locked artifact provenance", () => {
    const incomplete = initialAiMeasurementPrereviewRecords.map(
      (record): AiMeasurementPrereviewRecord => ({
        ...record,
        status: "completed_no_blockers",
      }),
    );

    expect(validateAiMeasurementPrereviewRecord(incomplete[0]!)).toEqual([
      "ARTIFACT_MANIFEST_HASH_REQUIRED",
      "COMPLETED_AT_REQUIRED",
      "RUN_PROVENANCE_REQUIRED",
    ]);
    expect(summarizeAiMeasurementPrereview(incomplete)).toMatchObject({
      canChangeHumanValidationGate: false,
      state: "running",
    });
  });
});
