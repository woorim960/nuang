import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickScoringRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { CandidateCoreResultView } from "@/features/result/CandidateCoreResultView";
import { calculateCoreScore } from "@/lib/scoring/core";

describe("CandidateCoreResultView", () => {
  it("shows the approved role name before the readable overview and axis details", () => {
    const now = "2026-07-19T00:00:00.000Z";
    const responses = Object.fromEntries(
      betaCoreAssessment.items.map((item) => [
        item.itemId,
        {
          answeredAt: now,
          itemId: item.itemId,
          value: item.isReverse ? (1 as const) : (5 as const),
        },
      ]),
    );
    const attempt: LocalAssessmentAttempt = {
      assessmentId: betaCoreAssessment.assessmentId,
      completedAt: now,
      completionStatus: "completed",
      createdAt: now,
      currentIndex: betaCoreAssessment.items.length - 1,
      expiresAt: "2026-07-26T00:00:00.000Z",
      id: "local_candidate_result_view",
      itemIds: betaCoreAssessment.items.map((item) => item.itemId),
      mode: betaCoreAssessment.mode,
      releaseId: betaCoreAssessment.releaseId,
      responses,
      state: "completed",
      updatedAt: now,
    };
    const result = calculateCoreScore(
      betaScoringRelease,
      Object.values(responses),
    );

    const { rerender } = render(
      <CandidateCoreResultView attempt={attempt} result={result} />,
    );

    expect(result.code).toBe("ENAKQ");
    expect(screen.getByText("정밀 성향 결과")).toBeInTheDocument();
    expect(screen.queryByText(/연구 중인|예비 결과/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "관계를 여는 지휘자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "이번 답에서 보인 내 모습",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/새로운 관점을 더 찾아봐요/)).toBeInTheDocument();
    expect(screen.getByText(/상대가 어떤 마음인지/)).toBeInTheDocument();
    expect(screen.getByText(/빠르게 커질 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByText("다섯 자리 요약")).not.toBeInTheDocument();
    expect(screen.queryByText("눈에 띈 모습")).not.toBeInTheDocument();
    expect(
      screen.queryByText("이번 답에서 비교적 분명했어요"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "이 결과는 어떻게 봐야 하나요?" }),
    );
    expect(
      screen.getByText(/여러 생활 상황에서 답한 내용/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "뉴앙 코드 소개 보기" }),
    ).toHaveAttribute("href", "/map?view=code-guide");
    expect(
      screen
        .getByRole("tab", { name: /E 사람 사이 에너지/ })
        .querySelector("strong")?.className,
    ).toContain("clearTabLetter");
    expect(
      screen.getByRole("link", { name: /홈에서 계속 둘러보기/ }),
    ).toHaveAttribute("href", "/home");

    fireEvent.click(
      screen.getByRole("tab", { name: /A.*관계에서 관심이 가는 곳/ }),
    );
    expect(
      screen.getByRole("tabpanel", {
        name: /A.*관계에서 관심이 가는 곳/,
      }),
    ).toHaveTextContent("원인과 해결할 부분에 관심");
    expect(
      screen.getByRole("img", {
        name: /G 방향 0퍼센트, A 방향 100퍼센트/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/성향일 확률이나 검사 정확도를 뜻하지 않아요/),
    ).toBeInTheDocument();

    rerender(
      <CandidateCoreResultView
        attempt={attempt}
        result={{
          ...result,
          domains: result.domains.map((domain) => ({
            ...domain,
            isBoundary: true,
            score: 52,
          })),
        }}
      />,
    );
    expect(screen.getByText("두 글자가 함께 보이는 이유")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", {
        name: /사람 사이 에너지.*E 52퍼센트, I 48퍼센트.*E에 조금 더 가까움/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /G 방향 48퍼센트, A 방향 52퍼센트.*A 방향이 더 가깝습니다/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "두 방향이 비슷하게 나타난 자리도 함께 살펴봐 주세요.",
      ),
    ).not.toBeInTheDocument();

    rerender(
      <CandidateCoreResultView
        attempt={attempt}
        result={{
          ...result,
          domains: result.domains.map((domain) => ({
            ...domain,
            isBoundary: true,
            score: 50,
          })),
        }}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "두 글자의 점수가 같게 나왔어요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /G 방향 50퍼센트, A 방향 50퍼센트.*두 글자의 점수가 같습니다/,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("조금 더 가까움")).not.toBeInTheDocument();

    rerender(
      <CandidateCoreResultView
        attempt={attempt}
        result={{
          ...result,
          code: "INAKQ",
          domains: result.domains.map((domain) =>
            domain.domainId === "SE"
              ? {
                  ...domain,
                  isBoundary: false,
                  score: 30,
                  symbol: "I",
                }
              : domain,
          ),
        }}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /I 사람 사이 에너지/ }));
    expect(
      screen.getByRole("img", {
        name: /E 방향 30퍼센트, I 방향 70퍼센트.*I 방향이 더 가깝습니다/,
      }),
    ).toBeInTheDocument();
  });

  it("gives a first quick result one clear path to precision and one path home", () => {
    const now = "2026-07-19T00:00:00.000Z";
    const responses = Object.fromEntries(
      candidateQuickCoreAssessment.items.map((item) => [
        item.itemId,
        {
          answeredAt: now,
          itemId: item.itemId,
          value: item.isReverse ? (1 as const) : (5 as const),
        },
      ]),
    );
    const attempt: LocalAssessmentAttempt = {
      assessmentId: candidateQuickCoreAssessment.assessmentId,
      completedAt: now,
      completionStatus: "completed",
      createdAt: now,
      currentIndex: candidateQuickCoreAssessment.items.length - 1,
      expiresAt: "2026-07-26T00:00:00.000Z",
      id: "local_candidate_quick_result_view",
      itemIds: candidateQuickCoreAssessment.items.map((item) => item.itemId),
      mode: candidateQuickCoreAssessment.mode,
      releaseId: candidateQuickCoreAssessment.releaseId,
      responses,
      state: "completed",
      updatedAt: now,
    };
    const result = calculateCoreScore(
      candidateQuickScoringRelease,
      Object.values(responses),
    );

    render(<CandidateCoreResultView attempt={attempt} result={result} />);

    expect(screen.getByText("첫 성향 결과")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "첫 답에서 보인 내 모습" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /정밀 검사로 더 알아보기/ }),
    ).toHaveAttribute(
      "href",
      "/assessments/nu-core-full?from=first-result&backTo=%2Fresults%2Flocal%2Flocal_candidate_quick_result_view",
    );
    expect(
      screen.getByRole("link", { name: "홈에서 먼저 둘러보기" }),
    ).toHaveAttribute("href", "/home");
  });
});
