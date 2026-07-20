import { describe, expect, it } from "vitest";
import {
  buildGateCAnalysis,
  type GateCAnalysisResponseRow,
  type GateCAnalysisSessionRow,
} from "@/features/research/gate-c/gate-c-auto-analysis";
import { gateCParticipantDefinitions } from "@/features/research/gate-c/gate-c-study-fixture";

describe("Gate C automatic field-signal analysis", () => {
  it("requires enough observations and sends risky wording to human review", () => {
    const sessions = Array.from({ length: 8 }, (_, index) => ({
      id: `included-${index}`,
      quality_status: "included" as const,
      status: "completed" as const,
    }));
    const [cleanItem, unclearItem, unseenItem] =
      gateCParticipantDefinitions.FORM_A.items;
    const responses: GateCAnalysisResponseRow[] = sessions.flatMap(
      (session, index) => [
        response(session.id, cleanItem.studyItemId, {
          first_answer_elapsed_ms: 2200 + index * 100,
        }),
        response(session.id, unclearItem.studyItemId, {
          confusion_flag: index < 2,
          unsure_reason: index < 2 ? "WORDING_UNCLEAR" : null,
        }),
      ],
    );

    const analysis = buildGateCAnalysis(sessions, responses);
    const cleanMetric = analysis.itemMetrics.find(
      (metric) => metric.studyItemId === cleanItem.studyItemId,
    );
    const unclearMetric = analysis.itemMetrics.find(
      (metric) => metric.studyItemId === unclearItem.studyItemId,
    );
    const unseenMetric = analysis.itemMetrics.find(
      (metric) => metric.studyItemId === unseenItem.studyItemId,
    );

    expect(cleanMetric).toMatchObject({
      observationCount: 8,
      recommendationStatus: "monitor",
      reasonCodes: [],
    });
    expect(cleanMetric?.medianFirstAnswerMs).toBe(2550);
    expect(unclearMetric).toMatchObject({
      observationCount: 8,
      recommendationStatus: "review_required",
      wordingUnclearRate: 0.25,
    });
    expect(unclearMetric?.reasonCodes).toEqual(
      expect.arrayContaining(["WORDING_REVIEW", "COMPREHENSION_REVIEW"]),
    );
    expect(unseenMetric).toMatchObject({
      observationCount: 0,
      recommendationStatus: "insufficient_data",
      reasonCodes: ["NEED_MORE_RESPONSES"],
    });
  });

  it("excludes suspicious sessions from every item metric", () => {
    const sessions: GateCAnalysisSessionRow[] = [
      { id: "included", quality_status: "included", status: "completed" },
      { id: "excluded", quality_status: "excluded", status: "completed" },
      { id: "started", quality_status: "pending", status: "started" },
    ];
    const itemId = gateCParticipantDefinitions.FORM_B.items[0].studyItemId;
    const analysis = buildGateCAnalysis(sessions, [
      response("included", itemId),
      response("excluded", itemId, { confusion_flag: true }),
    ]);

    expect(analysis).toMatchObject({
      completedSessionCount: 2,
      excludedSessionCount: 1,
      includedSessionCount: 1,
      startedSessionCount: 3,
    });
    expect(
      analysis.itemMetrics.find((metric) => metric.studyItemId === itemId),
    ).toMatchObject({ observationCount: 1, confusionFlagRate: 0 });
  });
});

function response(
  sessionId: string,
  studyItemId: string,
  patch: Partial<GateCAnalysisResponseRow> = {},
): GateCAnalysisResponseRow {
  return {
    confusion_flag: false,
    first_answer_elapsed_ms: 2500,
    response_changed: false,
    session_id: sessionId,
    study_item_id: studyItemId,
    unsure_reason: null,
    ...patch,
  };
}
