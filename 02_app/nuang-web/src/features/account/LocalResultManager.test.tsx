import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalResultManager } from "@/features/account/LocalResultManager";
import {
  deleteLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import { deleteLabResult, listLabResults } from "@/features/lab/lab-storage";

const fetchMock = vi.fn();

vi.mock("@/features/assessment/assessment-storage", () => ({
  deleteLocalAttempt: vi.fn(),
  listLocalAttempts: vi.fn(),
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
  deleteLabResult: vi.fn(),
  getLabExpiresAt: vi.fn((result) => result.expiresAt),
  listLabResults: vi.fn(),
}));

describe("LocalResultManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listLocalAttempts).mockResolvedValue([]);
    vi.mocked(listLabResults).mockReturnValue([]);
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true, results: [] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
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
      await screen.findByText("완료한 검사와 진행 중인 검사를 모아봤어요"),
    ).toBeInTheDocument();
    expect(screen.getByText("0개")).toBeInTheDocument();
    expect(
      screen.getByText(/공유 주소와 비교 기록도 함께 정리됩니다/),
    ).toBeInTheDocument();
    expect(screen.getByText("아직 결과가 없어요")).toBeInTheDocument();
    expect(screen.queryByText(/기기|계정 저장|로컬/)).not.toBeInTheDocument();
  });

  it("treats empty account result responses as an empty account list", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    render(<LocalResultManager />);

    expect(
      await screen.findByText("완료한 검사와 진행 중인 검사를 모아봤어요"),
    ).toBeInTheDocument();
    expect(screen.getByText("0개")).toBeInTheDocument();
    expect(screen.getByText("아직 결과가 없어요")).toBeInTheDocument();
  });

  it("keeps delete and export rights visible for stored local results", async () => {
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

    expect(await screen.findByText("정밀 코어")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /정밀 코어 결과 열기/ }),
    ).toHaveAttribute("href", "/results/local/local_test_1");
    expect(
      screen.getByRole("button", { name: "정밀 코어 삭제" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "내 데이터 JSON 내려받기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/응답과 결과를 JSON 파일로 내려받습니다/),
    ).toBeInTheDocument();
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

  it("deletes a lab result after confirmation", async () => {
    vi.mocked(listLabResults).mockReturnValue([
      {
        answers: {},
        completedAt: "2026-07-08T00:00:00.000Z",
        expiresAt: "2026-08-07T00:00:00.000Z",
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

    expect(deleteLabResult).toHaveBeenCalledWith("conversation-temperature");
  });

  it("merges matching local and account results into one row", async () => {
    vi.mocked(listLocalAttempts).mockResolvedValue([createCoreAttempt()]);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          results: [
            createAccountResult({
              localResultId: "local_test_1",
              resultReportId: "22222222-2222-4222-8222-222222222222",
            }),
            createAccountResult({
              kind: "quick",
              localResultId: "local_other_device",
              profileName: "햇살 리듬 탐험가",
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

    expect(await screen.findByText("2개")).toBeInTheDocument();
    expect(screen.getAllByText("정밀 코어")).toHaveLength(1);
    expect(screen.queryByText(/계정|기기|로컬/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /정밀 코어 결과 열기/ }),
    ).toHaveAttribute("href", "/results/local/local_test_1");
    expect(
      screen.getByRole("link", { name: "빠른 코어 결과 열기" }),
    ).toHaveAttribute(
      "href",
      "/results/account/33333333-3333-4333-8333-333333333333",
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
                comparisonReports: [
                  {
                    accessStatus: "active",
                    comparisonReportId: "44444444-4444-4444-8444-444444444444",
                    createdAt: "2026-07-09T00:00:00.000Z",
                    headline:
                      "편하게 맞는 자리는 마음이 흔들릴 때의 반응이에요.",
                    targetCode: "SVODE",
                    targetDisplayName: "상대",
                    targetProfileName: "물결의 새길 개척가",
                    viewerCode: "TVOAE",
                    viewerProfileName: "불꽃의 온기 탐험가",
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
    expect(screen.getByText("TVOAE와 SVODE · 상대")).toBeInTheDocument();
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
    profileCode: "TVOAE",
    profileName: overrides.profileName ?? "불꽃의 온기 탐험가",
    resultLabel: "현재 대표 성향",
    resultReportId:
      overrides.resultReportId ?? "22222222-2222-4222-8222-222222222222",
  };
}
