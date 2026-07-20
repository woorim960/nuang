import { describe, expect, it } from "vitest";
import {
  canExportGateCSession,
  createEmptyGateCProbeRecord,
  gateCFormIds,
  hasMandatoryGateCProbeEvidence,
  isGateCFormId,
  type GateCNaturalResponseRecord,
} from "@/features/research/gate-c/gate-c-study-contract";
import { gateCParticipantDefinitions } from "@/features/research/gate-c/gate-c-study-fixture";

describe("Gate C study contract", () => {
  it("loads five opaque 12-item forms without target keys", () => {
    expect(Object.keys(gateCParticipantDefinitions)).toEqual([...gateCFormIds]);

    for (const definition of Object.values(gateCParticipantDefinitions)) {
      expect(definition.items).toHaveLength(12);
      expect(JSON.stringify(definition)).not.toMatch(
        /SE-RE|SE-AI|OE-AE|OE-CI|OE-IE|RO-EC|SM-EP|SM-OS|ER-IR|ER-WD|\bHIGH\b|\bLOW\b/i,
      );
    }
  });

  it("accepts only the five locked form IDs", () => {
    expect(isGateCFormId("FORM_A")).toBe(true);
    expect(isGateCFormId("FORM_F")).toBe(false);
  });

  it("requires all four response-process summaries before export", () => {
    const record = createEmptyGateCProbeRecord();
    expect(hasMandatoryGateCProbeEvidence(record)).toBe(false);

    record.comprehensionSummary = "상황을 이렇게 이해함";
    record.recallSummary = "최근 경험을 떠올림";
    record.judgmentSummary = "평소 빈도를 기준으로 판단함";
    record.responseSelectionSummary = "두 선택지 사이에서 고민함";
    expect(hasMandatoryGateCProbeEvidence(record)).toBe(true);
  });

  it("does not export a partial session", () => {
    const definition = gateCParticipantDefinitions.FORM_A;
    const naturalResponses: Record<string, GateCNaturalResponseRecord> = {
      [definition.items[0].studyItemId]: {
        firstChoice: { kind: "scale", value: 3 },
        currentChoice: { kind: "scale", value: 3 },
        responseChanged: false,
        firstAnsweredElapsedMs: 1200,
      },
    };

    expect(canExportGateCSession(definition, naturalResponses, {})).toBe(false);
  });
});
