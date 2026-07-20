import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyTraitDetailView } from "@/features/account/MyTraitDetailView";
import type { AccountResultSummary } from "@/features/account/account-result-contract";

const traitDetailMocks = vi.hoisted(() => ({
  localAttempts: [] as unknown[],
  topicResults: [] as unknown[],
}));

vi.mock("@/components/character/NuangCharacter", () => ({
  NuangCharacter: () => <span aria-label="뉴앙 캐릭터" />,
}));

vi.mock("@/components/ui/TraitRadarChart", () => ({
  TraitRadarChart: ({ centerLabel }: { centerLabel: string }) => (
    <div aria-label="코드 지도 차트">{centerLabel}</div>
  ),
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => traitDetailMocks.localAttempts),
}));

vi.mock("@/features/assessment/free-topic-storage", () => ({
  listFreeTopicResultsLocalFirst: vi.fn(
    async () => traitDetailMocks.topicResults,
  ),
  syncQueuedFreeTopicResults: vi.fn(async () => undefined),
}));

describe("MyTraitDetailView", () => {
  afterEach(() => {
    traitDetailMocks.localAttempts = [];
    traitDetailMocks.topicResults = [];
    vi.unstubAllGlobals();
  });

  it("shows the current five axes in code order with both percentages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              results: [createAccountResult()],
            }),
            { status: 200 },
          ),
      ),
    );

    render(<MyTraitDetailView />);

    expect(await screen.findByText("새 길을 찾는 탐구자")).toBeInTheDocument();
    expect(screen.getAllByText("INGMC")).toHaveLength(2);
    expect(screen.getAllByTestId("trait-axis-row")).toHaveLength(5);
    expect(screen.getByText("사람 사이 에너지")).toBeInTheDocument();
    expect(screen.getByText("생각과 탐색")).toBeInTheDocument();
    expect(screen.getByText("관계에서 관심이 가는 곳")).toBeInTheDocument();
    expect(screen.getByText("일상을 꾸리는 방식")).toBeInTheDocument();
    expect(screen.getByText("걱정과 감정 반응")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "I 62%, E 38%" })).toBeVisible();
    expect(screen.getByRole("img", { name: "R 27%, N 73%" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "전체 리포트 보기" }),
    ).toHaveAttribute(
      "href",
      "/results/account/4292e0e7-0353-43f0-9132-f90149badee5",
    );
  });

  it("offers one clear starting action when no result exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true, results: [] }), {
            status: 200,
          }),
      ),
    );

    render(<MyTraitDetailView />);

    expect(await screen.findByText("아직 결과가 없어요")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "코어 검사 시작하기" }),
    ).toHaveAttribute(
      "href",
      "/assessments/nu-core-quick?returnTo=%2Fmy%2Fprofile",
    );
  });
});

function createAccountResult(): AccountResultSummary {
  return {
    assessmentAttemptId: "attempt-account",
    completedAt: "2026-07-19T03:00:00.000Z",
    createdAt: "2026-07-19T03:00:00.000Z",
    domains: [
      {
        domainId: "RO",
        label: "관계에서 관심이 가는 곳",
        score: 35,
        symbol: "G",
      },
      {
        domainId: "ER",
        label: "걱정과 감정 반응",
        score: 29,
        symbol: "C",
      },
      {
        domainId: "SE",
        label: "사람 사이 에너지",
        score: 38,
        symbol: "I",
      },
      {
        domainId: "SM",
        label: "일상을 꾸리는 방식",
        score: 41,
        symbol: "M",
      },
      {
        domainId: "OE",
        label: "생각과 탐색",
        score: 73,
        symbol: "N",
      },
    ],
    facets: [
      {
        facetId: "SE-RE",
        label: "회복 방향",
        score: 42,
        status: "valid",
      },
    ],
    kind: "full",
    localResultId: null,
    profileCode: "INGMC",
    profileName: "새 길을 찾는 탐구자",
    resultLabel: "현재 가장 가까운 대표 성향",
    resultReportId: "4292e0e7-0353-43f0-9132-f90149badee5",
  };
}
