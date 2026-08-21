import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalResultManager } from "@/features/account/LocalResultManager";
import {
  deleteLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import {
  listFreeTopicResultsLocalFirst,
  type StoredFreeTopicResult,
} from "@/features/assessment/free-topic-storage";
import {
  deleteLabResultEverywhere,
  listLabResultsLocalFirst,
} from "@/features/lab/lab-storage";

const fetchMock = vi.fn();
const authScopeMocks = vi.hoisted(() => ({
  userId: "auth-user-a" as string | null,
}));

vi.mock("@/features/assessment/assessment-storage", () => ({
  deleteLocalAttempt: vi.fn(),
  listLocalAttempts: vi.fn(),
}));

vi.mock("@/features/assessment/assessment-account-sync", () => ({
  synchronizeAccountAssessmentAttempts: vi.fn(async () => ({
    attempts: [],
    status: "unauthenticated",
  })),
}));

vi.mock("@/features/assessment/free-topic-storage", () => ({
  deleteFreeTopicResultEverywhere: vi.fn(async () => "deleted"),
  listFreeTopicResultsLocalFirst: vi.fn(),
  syncQueuedFreeTopicResults: vi.fn(async () => ({ attempted: 0, synced: 0 })),
}));

vi.mock("@/features/lab/lab-assessments", () => ({
  labAssessments: [
    {
      slug: "conversation-temperature",
      title: "대화 온도 실험",
    },
  ],
}));

vi.mock("@/features/lab/lab-storage", () => ({
  deleteLabResultEverywhere: vi.fn(async () => "deleted"),
  getLabExpiresAt: vi.fn((result) => result.expiresAt),
  listLabResultsLocalFirst: vi.fn(),
}));

vi.mock("@/features/result-persistence/client-result-scope", () => ({
  readCurrentSupabaseUserId: vi.fn(async () => authScopeMocks.userId),
  verifyStableResultAuthScope: vi.fn(
    async ({
      requestUserId,
      responseUserId,
    }: {
      requestUserId: string | null;
      responseUserId?: string;
    }) =>
      requestUserId &&
      responseUserId === requestUserId &&
      authScopeMocks.userId === requestUserId
        ? requestUserId
        : null,
  ),
}));

describe("LocalResultManager", () => {
  beforeEach(() => {
    authScopeMocks.userId = "auth-user-a";
    vi.clearAllMocks();
    vi.mocked(listLocalAttempts).mockResolvedValue([]);
    vi.mocked(listFreeTopicResultsLocalFirst).mockResolvedValue([]);
    vi.mocked(listLabResultsLocalFirst).mockResolvedValue([]);
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            results: [],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("presents results without exposing their storage location", async () => {
    render(<LocalResultManager />);

    expect(
      await screen.findByText("첫 성향 리포트를 만들어보세요"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "관계 비교" })).toBeVisible();
    expect(screen.queryByText("아직 결과가 없어요")).not.toBeInTheDocument();
    expect(screen.queryByText(/기기|계정 저장|로컬/)).not.toBeInTheDocument();
  });

  it("treats empty account result responses as an empty account list", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    render(<LocalResultManager />);

    expect(
      await screen.findByText("첫 성향 리포트를 만들어보세요"),
    ).toBeInTheDocument();
    expect(screen.queryByText("아직 결과가 없어요")).not.toBeInTheDocument();
  });

  it("downloads every loaded report as a private JSON export", async () => {
    render(<LocalResultManager />);

    const exportButton = await screen.findByRole("button", {
      name: "내보내기",
    });
    const createObjectURL = vi.fn(() => "blob:nuang-export");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const anchor = {
      click,
      download: "",
      href: "",
    } as unknown as HTMLAnchorElement;
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(window, "setTimeout").mockImplementation((handler) => {
      if (typeof handler === "function") handler();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    fireEvent.click(exportButton);

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchor.download).toMatch(/^nuang-data-\d{4}-\d{2}-\d{2}\.json$/);
    expect(anchor.href).toBe("blob:nuang-export");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:nuang-export");
  });

  it("keeps report access and delete rights visible for stored local results", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([
      {
        assessmentId: "nu-core-full",
        completedAt: "2026-07-08T00:00:00.000Z",
        createdAt: "2026-07-08T00:00:00.000Z",
        currentIndex: 59,
        expiresAt: "2026-08-07T00:00:00.000Z",
        id: "local_test_1",
        itemIds: [],
        mode: "full",
        releaseId: "full-core.v0.1",
        responses: {},
        state: "completed",
        updatedAt: "2026-07-08T00:00:00.000Z",
      },
    ]);

    render(<LocalResultManager />);

    expect(await screen.findByText("최근 검사 결과")).toBeInTheDocument();
    expect(screen.getByText("정밀 코어")).toBeInTheDocument();
    expect(screen.getByText("탐색적 베타 결과")).toBeVisible();
    expect(
      screen.getByText("참고용 · 대표 코드로 사용되지 않음 · 공유 불가"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /정밀 코어 결과 열기/ }),
    ).toHaveAttribute(
      "href",
      "/results/local/local_test_1?backTo=%2Fmy%2Freports%2Fhistory",
    );
    expect(
      screen.getByRole("button", { name: "정밀 코어 삭제" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("내 데이터 보관하기")).not.toBeInTheDocument();
  });

  it("puts the newest topic assessment above an older core result", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    vi.mocked(listFreeTopicResultsLocalFirst).mockResolvedValue([
      createTopicResult(),
    ]);

    render(<LocalResultManager />);

    expect(await screen.findByText("최근 검사 결과")).toBeInTheDocument();
    expect(screen.getAllByText("위로받을 때 필요한 것")).toHaveLength(1);
    expect(
      screen.getByRole("link", {
        name: "위로받을 때 필요한 것 결과 열기",
      }),
    ).toHaveAttribute(
      "href",
      "/assessments/topics/comfort-style/result/topic_comfort_latest",
    );
    expect(
      screen.getByRole("heading", { name: "지난 검사 결과" }),
    ).toBeInTheDocument();
    expect(screen.getByText("정밀 코어")).toBeInTheDocument();
  });

  it("does not delete a core result when confirmation is cancelled", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<LocalResultManager />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "정밀 코어 삭제",
      }),
    );

    expect(confirmSpy).toHaveBeenCalledWith(
      "이 리포트를 삭제할까요? 삭제하면 다시 열 수 없고 공유 주소와 비교 기록도 함께 삭제돼요.",
    );
    expect(deleteLocalAttempt).not.toHaveBeenCalled();
  });

  it("deletes a core result after confirmation", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalResultManager />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "정밀 코어 삭제",
      }),
    );

    await waitFor(() => {
      expect(deleteLocalAttempt).toHaveBeenCalledWith("local_test_1");
    });
    await waitFor(() => {
      expect(screen.queryByText("정밀 코어")).not.toBeInTheDocument();
    });
  });

  it("binds an account result deletion to the stable signed-in user", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        if (
          String(input) === "/api/account-results" &&
          init?.method === "DELETE"
        ) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ authUserId: "auth-user-a", ok: true }),
              { status: 200 },
            ),
          );
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              authUserId: "auth-user-a",
              ok: true,
              results: [createAccountResult()],
            }),
            { status: 200 },
          ),
        );
      },
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalResultManager />);
    fireEvent.click(
      await screen.findByRole("button", { name: "정밀 코어 삭제" }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/account-results",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-nuang-auth-user-id": "auth-user-a",
          }),
          method: "DELETE",
        }),
      );
      expect(deleteLocalAttempt).toHaveBeenCalledWith("local_test_1");
    });
  });

  it("keeps a core result when account A changes to B during deletion", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        if (
          String(input) === "/api/account-results" &&
          init?.method === "DELETE"
        ) {
          authScopeMocks.userId = "auth-user-b";
          return Promise.resolve(
            new Response(
              JSON.stringify({ authUserId: "auth-user-a", ok: true }),
              { status: 200 },
            ),
          );
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              authUserId: "auth-user-a",
              ok: true,
              results: [createAccountResult()],
            }),
            { status: 200 },
          ),
        );
      },
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalResultManager />);
    fireEvent.click(
      await screen.findByRole("button", { name: "정밀 코어 삭제" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "결과를 삭제하지 못했어요",
    );
    expect(deleteLocalAttempt).not.toHaveBeenCalled();
    expect(screen.getByText("정밀 코어")).toBeInTheDocument();
  });

  it("keeps a core result when the deletion session has expired", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        if (
          String(input) === "/api/account-results" &&
          init?.method === "DELETE"
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "unauthenticated" }), {
              status: 401,
            }),
          );
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              authUserId: "auth-user-a",
              ok: true,
              results: [createAccountResult()],
            }),
            { status: 200 },
          ),
        );
      },
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalResultManager />);
    fireEvent.click(
      await screen.findByRole("button", { name: "정밀 코어 삭제" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "결과를 삭제하지 못했어요",
    );
    expect(deleteLocalAttempt).not.toHaveBeenCalled();
    expect(screen.getByText("정밀 코어")).toBeInTheDocument();
  });

  it("deletes a lab result after confirmation", async () => {
    vi.mocked(listLabResultsLocalFirst).mockResolvedValue([
      {
        answers: {},
        completedAt: "2026-07-08T00:00:00.000Z",
        expiresAt: "2026-08-07T00:00:00.000Z",
        localResultId: "lab_result_attempt_1",
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
    ]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalResultManager />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "대화 온도 실험 삭제",
      }),
    );

    expect(deleteLabResultEverywhere).toHaveBeenCalledWith(
      "lab_result_attempt_1",
    );
  });

  it("merges matching local and account results into one row", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          results: [
            createAccountResult({
              localResultId: "local_test_1",
              resultReportId: "22222222-2222-4222-8222-222222222222",
            }),
            createAccountResult({
              kind: "quick",
              localResultId: "local_other_device",
              profileName: "새 가능성을 찾는 탐험가",
              resultReportId: "33333333-3333-4333-8333-333333333333",
            }),
          ],
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    render(<LocalResultManager />);

    expect(await screen.findByText("최근 검사 결과")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "지난 검사 결과" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("정밀 코어")).toHaveLength(1);
    expect(screen.getAllByText(/탐색적 베타/)).toHaveLength(2);
    expect(screen.getAllByText(/참고용 · 공유 불가/)).toHaveLength(1);
    expect(screen.queryByText(/계정|기기|로컬/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /정밀 코어 결과 열기/ }),
    ).toHaveAttribute(
      "href",
      "/results/local/local_test_1?backTo=%2Fmy%2Freports%2Fhistory",
    );
    expect(
      screen.getByRole("link", { name: "빠른 코어 결과 열기" }),
    ).toHaveAttribute(
      "href",
      "/results/account/33333333-3333-4333-8333-333333333333?backTo=%2Fmy%2Freports%2Fhistory",
    );
    expect(
      screen.getByRole("button", { name: "빠른 코어 삭제" }),
    ).toBeInTheDocument();
  });

  it("shows comparison reports in the same report list and deletes them through the comparison API", async () => {
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/account-results") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                authUserId: "auth-user-a",
                comparisonReports: [
                  {
                    accessStatus: "active",
                    comparisonReportId: "44444444-4444-4444-8444-444444444444",
                    createdAt: "2026-07-09T00:00:00.000Z",
                    headline:
                      "편하게 맞는 자리는 마음이 흔들릴 때의 반응이에요.",
                    targetCode: "ENAKQ",
                    targetDisplayName: "상대",
                    targetProfileName: "관계를 여는 선도자",
                    viewerCode: "INGMC",
                    viewerProfileName: "새 가능성을 찾는 탐험가",
                  },
                ],
                ok: true,
                results: [],
              }),
              {
                headers: { "content-type": "application/json" },
                status: 200,
              },
            ),
          );
        }

        if (
          url === "/api/public-comparison-report" &&
          init?.method === "DELETE"
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ ok: true }), {
              headers: { "content-type": "application/json" },
              status: 200,
            }),
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({ ok: false }), { status: 500 }),
        );
      },
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LocalResultManager />);

    expect(await screen.findByText("1:1 비교 리포트")).toBeInTheDocument();
    expect(screen.getByText("INGMC와 ENAKQ · 상대")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "1:1 비교 리포트 결과 열기" }),
    ).toHaveAttribute(
      "href",
      "/reports/comparison/44444444-4444-4444-8444-444444444444",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "1:1 비교 리포트 삭제" }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/public-comparison-report",
        expect.objectContaining({
          body: JSON.stringify({
            comparisonReportId: "44444444-4444-4444-8444-444444444444",
          }),
          method: "DELETE",
        }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("1:1 비교 리포트")).not.toBeInTheDocument();
    });
  });

  it("shows only the latest in-progress attempt for each assessment", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([
      {
        ...createCoreAttempt(),
        completedAt: undefined,
        id: "local_old",
        state: "in_progress",
        updatedAt: "2026-07-07T00:00:00.000Z",
      },
      {
        ...createCoreAttempt(),
        completedAt: undefined,
        id: "local_new",
        state: "in_progress",
        updatedAt: "2026-07-09T00:00:00.000Z",
      },
    ]);

    render(<LocalResultManager />);

    expect(
      await screen.findByRole("link", { name: /정밀 코어 이어하기/ }),
    ).toHaveAttribute("href", "/assessments/nu-core-full");
    expect(screen.getAllByText("정밀 코어")).toHaveLength(1);
  });

  it("keeps legacy results accessible without exposing retired codes or beta attempts", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([
      {
        ...createCoreAttempt(),
        assessmentId: "nu-core-beta",
        completedAt: undefined,
        id: "legacy_beta_attempt",
        state: "in_progress",
      },
    ]);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          results: [
            {
              ...createAccountResult({ localResultId: null }),
              profileCode: "TVOAE",
              profileName: "불꽃의 온기 탐험가",
            },
          ],
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    render(<LocalResultManager />);

    expect(
      await screen.findByText("이전에 저장한 코어 검사 결과"),
    ).toBeInTheDocument();
    expect(screen.getByText("탐색적 베타 결과")).toBeVisible();
    expect(
      screen.getByText(/참고용 · 대표 코드로 사용되지 않음 · 공유 불가/),
    ).toBeVisible();
    expect(screen.queryByText("TVOAE")).not.toBeInTheDocument();
    expect(screen.queryByText("불꽃의 온기 탐험가")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "코어 검사 이어하기" }),
    ).not.toBeInTheDocument();
  });
});

function createCoreAttempt() {
  return {
    assessmentId: "nu-core-full",
    completedAt: "2026-07-08T00:00:00.000Z",
    createdAt: "2026-07-08T00:00:00.000Z",
    currentIndex: 59,
    expiresAt: "2026-08-07T00:00:00.000Z",
    id: "local_test_1",
    itemIds: [],
    mode: "full" as const,
    releaseId: "full-core.v0.1",
    responses: {},
    state: "completed" as const,
    updatedAt: "2026-07-08T00:00:00.000Z",
  };
}

function createTopicResult(): StoredFreeTopicResult {
  return {
    answers: {},
    assessment: {
      categoryId: "relationship",
      categoryLabel: "관계",
      slug: "comfort-style",
      title: "위로받을 때 필요한 것",
    },
    completedAt: "2026-07-28T07:20:00.000Z",
    expiresAt: "2027-07-28T07:20:00.000Z",
    formatVersion: 2,
    instrumentVersion: "comfort-style-v2-common-scenes-2026-07-28",
    localResultId: "topic_comfort_latest",
    reportContentVersion: "comfort-style-report-v3-personalized",
    reportSnapshot: {
      averageScore: 75,
      confidenceCopy: "최근 장면을 바탕으로 정리했어요.",
      confidenceLabel: "최근 도움 기록",
      headline: "마음을 알아주는 말이 가장 자주 도움이 됐어요.",
      longReportSections: [],
      signals: [],
    },
    result: {
      observations: [],
      scoresByScaleId: { emotional_acknowledgement: 75 },
      scoresByTargetId: {},
      summary: "마음을 알아주는 말이 가장 자주 도움이 됐어요.",
      validResponsesByScaleId: { emotional_acknowledgement: 4 },
    },
    scoringVersion: "comfort-style-scoring-v3-pattern-aware",
    sync: { status: "synced" },
  };
}

function createAccountResult(
  overrides: Partial<{
    kind: "full" | "quick";
    localResultId: string | null;
    profileName: string;
    resultReportId: string;
  }> = {},
) {
  return {
    assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
    completedAt: "2026-07-08T00:00:00.000Z",
    createdAt: "2026-07-08T00:00:00.000Z",
    domains: [],
    facets: [],
    kind: overrides.kind ?? "full",
    localResultId: overrides.localResultId ?? "local_test_1",
    profileCode: "INGMC",
    profileName: overrides.profileName ?? "새 가능성을 찾는 탐험가",
    resultLabel: "현재 대표 성향",
    resultReportId:
      overrides.resultReportId ?? "22222222-2222-4222-8222-222222222222",
    versionBundle: {
      assessmentReleaseId: "NUANG-CORE-FULL-CANDIDATE-1.0",
      codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
      scoringModelVersion: "NUANG-SCORING-MODEL-CANDIDATE-1.0",
      scoringReleaseId: "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
    },
  };
}
