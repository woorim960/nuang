import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyOverview } from "@/features/account/MyOverview";
import type { AccountResultSummary } from "@/features/account/account-result-contract";

const myOverviewMocks = vi.hoisted(() => ({
  authUser: { id: "auth-user" } as { id: string } | null,
  localAttempts: [] as unknown[],
}));

vi.mock("@/components/character/NuangCharacter", () => ({
  NuangCharacter: () => <span aria-label="뉴앙 캐릭터" />,
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  listLocalAttempts: vi.fn(async () => myOverviewMocks.localAttempts),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () =>
    myOverviewMocks.authUser
      ? {
          auth: {
            getUser: async () => ({
              data: { user: myOverviewMocks.authUser },
            }),
          },
        }
      : null,
}));

describe("MyOverview", () => {
  afterEach(() => {
    myOverviewMocks.authUser = { id: "auth-user" };
    myOverviewMocks.localAttempts = [];
    vi.unstubAllGlobals();
  });

  it("puts the latest identity and core personal routes first", async () => {
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

    render(<MyOverview />);

    expect(await screen.findByText("INGMC")).toBeInTheDocument();
    expect(screen.getByText("새 길을 찾는 탐구자")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 성향 보기" })).toHaveAttribute(
      "href",
      "/my/profile",
    );
    expect(screen.getByRole("link", { name: "최신 리포트" })).toHaveAttribute(
      "href",
      "/results/account/4292e0e7-0353-43f0-9132-f90149badee5",
    );
    expect(
      screen.getByRole("link", {
        name: /성향 놀이터 기록.*내가 참여한 질문과 선택을 다시 봐요/,
      }),
    ).toHaveAttribute("href", "/feed/perspectives?from=my");
    expect(
      screen.getByRole("link", {
        name: /내 게시물.*내 커뮤니티 프로필과 게시물을 확인해요/,
      }),
    ).toHaveAttribute("href", "/feed/me");
  });

  it("gives a first-time viewer one clear assessment action", async () => {
    myOverviewMocks.authUser = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true, results: [] }), {
            status: 200,
          }),
      ),
    );

    render(<MyOverview />);

    expect(
      await screen.findByText("내 뉴앙 코드를 만나보세요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "코어 검사 시작하기" }),
    ).toHaveAttribute("href", "/assessments");

    await waitFor(() => {
      expect(
        screen.getByRole("link", {
          name: /로그인하기.*리포트와 활동을 계정에 안전하게 이어서 저장해요/,
        }),
      ).toHaveAttribute("href", "/login?next=/my");
    });
  });
});

function createAccountResult(): AccountResultSummary {
  return {
    assessmentAttemptId: "attempt-account",
    completedAt: "2026-07-19T03:00:00.000Z",
    createdAt: "2026-07-19T03:00:00.000Z",
    domains: [],
    facets: [],
    kind: "full",
    localResultId: null,
    profileCode: "INGMC",
    profileName: "새 길을 찾는 탐구자",
    resultLabel: "현재 가장 가까운 대표 성향",
    resultReportId: "4292e0e7-0353-43f0-9132-f90149badee5",
  };
}
