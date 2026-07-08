import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { LocalResultView } from "@/features/result/LocalResultView";

const storageMock = vi.hoisted(() => ({
  getLocalAttempt: vi.fn(),
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  getLocalAttempt: storageMock.getLocalAttempt,
}));

describe("LocalResultView", () => {
  it("surfaces the result action deck for a full core result", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(fullCoreAssessment),
    );

    render(<LocalResultView localResultId="local_full" />);

    expect(
      await screen.findByRole("region", { name: "결과 활용" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "결과를 어디에 쓸까요" }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "성향지도 열기" })).toHaveAttribute(
      "href",
      "/map",
    );
    expect(
      screen.getByRole("link", { name: "함께 탭에서 피드와 비교 흐름 보기" }),
    ).toHaveAttribute("href", "/together");
    expect(screen.getByRole("link", { name: "공개 범위 확인하기" })).toHaveAttribute(
      "href",
      "/my",
    );
    expect(
      screen.getByRole("button", {
        name: "결과 이미지 파일로 저장하거나 기기 공유 시트 열기",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/서버 공유 링크를 만들지 않고/),
    ).toBeInTheDocument();
  });

  it("guides quick core results toward the full core extension", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(quickCoreAssessment),
    );

    render(<LocalResultView localResultId="local_quick" />);

    expect(await screen.findByText("정밀 코어로 확장")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "정밀 코어로 확장하기" }),
    ).toHaveAttribute("href", "/assessments/nu-core-full");
  });
});

function buildCompletedAttempt(
  assessment: AssessmentDefinition,
): LocalAssessmentAttempt {
  const now = new Date("2026-07-08T00:00:00.000Z").toISOString();

  return {
    assessmentId: assessment.assessmentId,
    completedAt: now,
    createdAt: now,
    currentIndex: assessment.items.length - 1,
    expiresAt: new Date("2026-08-07T00:00:00.000Z").toISOString(),
    id: `local_${assessment.assessmentId}`,
    itemIds: assessment.items.map((item) => item.itemId),
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses: Object.fromEntries(
      assessment.items.map((item) => [
        item.itemId,
        {
          answeredAt: now,
          isUnsure: false,
          itemId: item.itemId,
          value: 4,
        },
      ]),
    ),
    resultCopyVersion: "core-result-copy.v0.1",
    state: "completed",
    updatedAt: now,
  };
}
