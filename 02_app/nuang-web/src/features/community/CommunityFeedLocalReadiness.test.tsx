import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getLatestCompletedAttempt } from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { CommunityFeedLocalReadiness } from "@/features/community/CommunityFeedLocalReadiness";

vi.mock("@/features/assessment/assessment-storage", () => ({
  getLatestCompletedAttempt: vi.fn(),
}));

type LatestCompletedAttempt = Awaited<ReturnType<typeof getLatestCompletedAttempt>>;

const mockedGetLatestCompletedAttempt = vi.mocked(getLatestCompletedAttempt);
const noAttempt = undefined as unknown as LatestCompletedAttempt;

describe("CommunityFeedLocalReadiness", () => {
  afterEach(() => {
    mockedGetLatestCompletedAttempt.mockReset();
  });

  it("shows a stable readiness skeleton while local results are loading", () => {
    mockedGetLatestCompletedAttempt.mockImplementation(() => new Promise(() => {}));

    render(<CommunityFeedLocalReadiness />);

    expect(screen.getByRole("status")).toHaveTextContent("피드 추천 상태 확인 중");
    expect(screen.getByText("내 피드 준비도")).toBeInTheDocument();
    expect(screen.getByText("준비 중")).toBeInTheDocument();
  });

  it("links completed full-core users to public card and map surfaces", async () => {
    mockedGetLatestCompletedAttempt.mockImplementation(async (assessmentId) => {
      if (assessmentId === "nu-core-full") return createAttempt("nu-core-full");
      return noAttempt;
    });

    render(<CommunityFeedLocalReadiness />);

    expect(
      await screen.findByRole("heading", { name: "피드 카드 준비가 거의 끝났어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("공개 카드 준비")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "공개 카드" })).toHaveAttribute(
      "href",
      "/my",
    );
    expect(screen.getByRole("link", { name: "성향지도 보기" })).toHaveAttribute(
      "href",
      "/map",
    );
  });

  it("recommends full core when only quick core is complete", async () => {
    mockedGetLatestCompletedAttempt.mockImplementation(async (assessmentId) => {
      if (assessmentId === "nu-core-quick") return createAttempt("nu-core-quick");
      return noAttempt;
    });

    render(<CommunityFeedLocalReadiness />);

    expect(
      await screen.findByRole("heading", {
        name: "성향지도를 더 선명하게 만들 수 있어요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("확장 추천")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "정밀 코어" })).toHaveAttribute(
      "href",
      "/assessments/nu-core-full",
    );
  });

  it("sends new users to the quick core assessment", async () => {
    mockedGetLatestCompletedAttempt.mockResolvedValue(noAttempt);

    render(<CommunityFeedLocalReadiness />);

    expect(
      await screen.findByRole("heading", {
        name: "피드를 더 재밌게 보려면 첫 검사가 필요해요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("첫 시작 필요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "빠른 코어" })).toHaveAttribute(
      "href",
      "/assessments/nu-core-quick",
    );
  });
});

function createAttempt(assessmentId: "nu-core-full" | "nu-core-quick") {
  return {
    assessmentId,
    completedAt: "2026-07-04T00:00:00.000Z",
    createdAt: "2026-07-04T00:00:00.000Z",
    currentIndex: 0,
    expiresAt: "2026-08-03T00:00:00.000Z",
    id: `local_${assessmentId}`,
    itemIds: [],
    mode: assessmentId === "nu-core-full" ? "full" : "quick",
    releaseId: `${assessmentId}-test`,
    responses: {},
    state: "completed",
    updatedAt: "2026-07-04T00:00:00.000Z",
  } satisfies LocalAssessmentAttempt as LatestCompletedAttempt;
}
