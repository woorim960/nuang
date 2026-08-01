import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminResearchDashboard } from "@/features/admin/AdminResearchDashboard";
import type { GateCAnalysisDashboardData } from "@/features/research/gate-c/gate-c-analysis-dashboard";
import { evaluateGateCCandidatePromotion } from "@/features/research/gate-c/gate-c-candidate-promotion-policy";
import { gateCFormIds } from "@/features/research/gate-c/gate-c-study-contract";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const dashboard: GateCAnalysisDashboardData = {
  formCompletionCounts: Object.fromEntries(
    gateCFormIds.map((formId) => [formId, 0]),
  ) as GateCAnalysisDashboardData["formCompletionCounts"],
  generatedAt: "2026-07-28T00:00:00.000Z",
  queue: [
    {
      candidateSetId: "GATE-C-V1",
      contextLabel: "여럿이 함께 시간을 보낸 뒤",
      domainId: "SE",
      facetId: "SE-RE",
      metrics: {
        confusionFlagRate: 0.16,
        medianFirstAnswerMs: 4200,
        responseChangeRate: 0.12,
        unsureRate: 0.24,
        wordingUnclearRate: 0.2,
      },
      observationCount: 25,
      promotionGate: evaluateGateCCandidatePromotion({
        confusionFlagRate: 0.16,
        medianFirstAnswerMs: 4200,
        observationCount: 25,
        responseChangeRate: 0.12,
        sourceKind: "full_current",
        unsureRate: 0.24,
        wordingUnclearRate: 0.2,
      }),
      promptText: "혼자 쉬는 시간을 가지면 기운이 다시 살아난다.",
      protocolVersion: "GATE-C-P1",
      publicationState: "review_only",
      reasonCodes: ["WORDING_REVIEW"],
      recommendationStatus: "review_required",
      sourceKind: "full_current",
      studyItemId: "NU-B1-001",
      updatedAt: "2026-07-28T00:00:00.000Z",
    },
  ],
  queueCounts: {
    insufficientData: 0,
    monitor: 0,
    reviewRequired: 1,
  },
  sessionCounts: {
    completed: 12,
    excluded: 1,
    included: 11,
    started: 15,
  },
  sourceItemCounts: {
    candidate: 0,
    full_current: 1,
    legacy_fixed: 0,
    quick_current: 0,
  },
};

describe("AdminResearchDashboard", () => {
  it("shows a human-readable question and keeps technical IDs behind details", () => {
    render(
      <AdminResearchDashboard
        decisions={{ available: true, gateC: [], traitMap: [] }}
        gateC={dashboard}
        section="items"
        traitMap={[]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "혼자 쉬는 시간을 가지면 기운이 다시 살아난다.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("여럿이 함께 시간을 보낸 뒤")).toBeInTheDocument();
    expect(
      screen.getByText(/정밀 코어 검사 · 사람 사이 에너지/),
    ).toBeInTheDocument();
    expect(screen.getByText("문항 품질 검토 절차")).toBeInTheDocument();

    const details = screen
      .getByText("분석 근거와 연구 정보")
      .closest("details");
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("분석 근거와 연구 정보"));

    expect(details).toHaveAttribute("open");
    expect(screen.getByText("NU-B1-001")).toBeInTheDocument();
    expect(screen.getByText("함께할 때의 에너지")).toBeInTheDocument();
  });
});
