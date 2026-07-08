import { describe, expect, it } from "vitest";
import {
  buildLocalExportPayload,
  localExportPrivacyNote,
  localExportSchemaVersion,
} from "@/features/account/local-export";

describe("local export payload", () => {
  it("keeps schema, privacy note, core attempts, and lab expiry in the export file", () => {
    const payload = buildLocalExportPayload({
      coreAttempts: [
        {
          assessmentId: "nu-core-full",
          completedAt: "2026-07-08T00:00:00.000Z",
          createdAt: "2026-07-08T00:00:00.000Z",
          currentIndex: 59,
          expiresAt: "2026-08-07T00:00:00.000Z",
          id: "local_test_1",
          itemIds: ["item-1"],
          mode: "full",
          releaseId: "full-core.v0.1",
          responses: {
            "item-1": {
              answeredAt: "2026-07-08T00:00:00.000Z",
              itemId: "item-1",
              value: 4,
            },
          },
          state: "completed",
          updatedAt: "2026-07-08T00:00:00.000Z",
        },
      ],
      exportedAt: "2026-07-08T12:00:00.000Z",
      labResults: [
        {
          answers: {
            "ct-01": {
              optionId: "ct-01-a",
              questionId: "ct-01",
              resultId: "spark",
            },
          },
          completedAt: "2026-07-08T00:00:00.000Z",
          result: {
            profile: {
              id: "spark",
              relationTip: "대화 전 짧게 확인해요.",
              shortTitle: "바로 대화",
              smallExperiment: "오늘 한 번 물어보세요.",
              strengths: ["대화를 시작하기 쉬워요."],
              summary: "말하면서 정리하는 편이에요.",
              title: "바로 불을 켜는 대화 스타일",
              watch: "상대에게 빠르게 느껴질 수 있어요.",
            },
            scores: {
              spark: 3,
            },
            tiedProfileIds: [],
          },
          slug: "conversation-temperature",
        },
      ],
    });

    expect(payload.schema).toBe(localExportSchemaVersion);
    expect(payload.note).toBe(localExportPrivacyNote);
    expect(payload.note).toContain("직접 응답이 포함될 수 있으니 공유에 주의");
    expect(payload.coreAttempts[0]?.responses["item-1"]?.value).toBe(4);
    expect(payload.labResults[0]?.expiresAt).toBe("2026-08-07T00:00:00.000Z");
  });
});
