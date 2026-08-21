import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createResponseSnapshotHash } from "@/features/assessment/assessment-completion";
import {
  betaCoreAssessment,
  betaScoringRelease,
} from "@/features/assessment/beta-core-seed";
import {
  candidateQuickCoreAssessment,
  candidateQuickScoringRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import {
  candidateFullCoreAssessment,
  candidateFullScoringRelease,
} from "@/features/assessment/candidate-full-core-seed";
import { fullScoringRelease } from "@/features/assessment/full-core-seed";
import {
  quickCoreAssessment,
  quickScoringRelease,
} from "@/features/assessment/quick-core-seed";
import type {
  AssessmentDefinition,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import { LocalResultView } from "@/features/result/LocalResultView";
import { buildRequiredConsentHref } from "@/features/consent/required-consent-contract";
import { calculateCoreScore } from "@/lib/scoring/core";

const storageMock = vi.hoisted(() => ({
  beginLocalAdaptiveFollowUp: vi.fn(),
  deleteLocalAttempt: vi.fn(),
  getLocalAttempt: vi.fn(),
  reopenLocalAttemptForReview: vi.fn(),
  startLocalAdaptiveFollowUp: vi.fn(),
}));
const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
const authScopeMock = vi.hoisted(() => ({
  currentUserId: "auth-user-a" as string | null,
}));
const fetchMock = vi.fn();

function expectFiveCodeTabs() {
  expect(
    within(
      screen.getByRole("tablist", { name: "뉴앙 코드 자리 선택" }),
    ).getAllByRole("tab"),
  ).toHaveLength(5);
}

vi.mock("@/features/assessment/assessment-storage", () => ({
  beginLocalAdaptiveFollowUp: storageMock.beginLocalAdaptiveFollowUp,
  deleteLocalAttempt: storageMock.deleteLocalAttempt,
  getLocalAttempt: storageMock.getLocalAttempt,
  reopenLocalAttemptForReview: storageMock.reopenLocalAttemptForReview,
  startLocalAdaptiveFollowUp: storageMock.startLocalAdaptiveFollowUp,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/features/result-persistence/client-result-scope", () => ({
  readCurrentSupabaseUserId: vi.fn(async () => authScopeMock.currentUserId),
  verifyStableResultAuthScope: vi.fn(
    async ({
      requestUserId,
      responseUserId,
    }: {
      requestUserId: string | null;
      responseUserId: string | null | undefined;
    }) =>
      requestUserId &&
      responseUserId === requestUserId &&
      authScopeMock.currentUserId === requestUserId
        ? requestUserId
        : null,
  ),
}));

describe("LocalResultView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authScopeMock.currentUserId = "auth-user-a";
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          result: null,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    storageMock.startLocalAdaptiveFollowUp.mockImplementation(
      async (attempt, adaptiveItemIds) => ({
        ...attempt,
        adaptiveItemIds,
        adaptiveStatus: "intro" as const,
      }),
    );
    storageMock.beginLocalAdaptiveFollowUp.mockImplementation(
      async (attempt) => ({
        ...attempt,
        adaptiveStatus: "in_progress" as const,
      }),
    );
    storageMock.reopenLocalAttemptForReview.mockImplementation(
      async (attempt, currentIndex) => ({
        ...attempt,
        adaptiveItemIds: undefined,
        adaptiveStatus: undefined,
        completionStatus: undefined,
        currentIndex,
        resultSnapshot: undefined,
        state: "in_progress" as const,
      }),
    );
  });

  it("surfaces the result action deck for a full core result", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );

    render(<LocalResultView localResultId="local_full" />);

    expect(
      await screen.findByRole("heading", {
        name: "관계를 여는 선도자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "다음으로" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "내 성향지도 이어서 보기" }),
    ).toHaveAttribute("href", "/map/ENAKQ");
    expect(
      screen.getByRole("link", { name: "다른 검사 둘러보기" }),
    ).toHaveAttribute("href", "/home");
    expectFiveCodeTabs();
    expect(
      screen.queryByRole("button", {
        name: "검사 결과 공유",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("참고용 · 공유 불가")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 결과 삭제" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/계정 저장|이 기기에 저장|로컬 결과/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/문구 v/)).not.toBeInTheDocument();
    expect(screen.queryByText(/내부 QA/)).not.toBeInTheDocument();
  });

  it("guides quick core results toward the full core extension", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateQuickCoreAssessment),
    );

    render(<LocalResultView localResultId="local_quick" />);

    expect(
      await screen.findByText("정밀 검사 이어서 하기"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "정밀 검사로 더 알아보기" }),
    ).toHaveAttribute(
      "href",
      `/assessments/nu-core-full?from=first-result&backTo=${encodeURIComponent(
        `/results/local/local_${candidateQuickCoreAssessment.assessmentId}`,
      )}`,
    );
  });

  it("offers an exact-return login action for a guest core result", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthenticated" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    );

    render(<LocalResultView localResultId="local_full" />);

    expect(
      await screen.findByRole("heading", {
        name: "로그인하고 이번 결과를 내 기록에 이어가세요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "로그인하고 결과 저장" }),
    ).toHaveAttribute(
      "href",
      "/login?reason=result_save&next=%2Fresults%2Flocal%2Flocal_full",
    );
  });

  it("connects an eligible signed-in result in the background", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          analytics: false,
          is14OrOlder: true,
          marketing: false,
          privacy: true,
          terms: true,
        }),
      ),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: null,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: {
              restored: false,
              resultReportId: "22222222-2222-4222-8222-222222222222",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    render(<LocalResultView localResultId="local_full" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/claim-result",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(
      screen.queryByRole("button", { name: "검사 결과 공유" }),
    ).not.toBeInTheDocument();
    const claimCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/claim-result" && init?.method === "POST",
    );
    const claimBody = JSON.parse(String(claimCall?.[1]?.body));

    expect(claimBody.responses).toHaveLength(
      candidateFullCoreAssessment.items.length,
    );
    expect(claimBody.responses[0]).toMatchObject({
      answeredAt: expect.any(String),
      itemId: expect.any(String),
      value: expect.any(Number),
    });
    expect(claimBody.resultSummary).toEqual({
      completedAt: expect.any(String),
    });
    expect(claimBody.resultSummary).not.toHaveProperty("facets");
    expect(claimBody).not.toHaveProperty("profileCode");
    expect(claimCall?.[1]?.headers).toMatchObject({
      "x-nuang-auth-user-id": "auth-user-a",
    });
    expect(screen.queryByText(/계정에 저장/)).not.toBeInTheDocument();
  });

  it("routes a missing required-consent claim to renewal without retrying or login looping", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: null,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            code: "age_or_required_consent_missing",
            ok: false,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        ),
      );
    const resultHref = "/results/local/local_consent?backTo=%2Fmap";

    render(<LocalResultView backHref="/map" localResultId="local_consent" />);

    expect(
      await screen.findByText(
        "계정에 저장하려면 현재 필수 항목을 확인해 주세요. 이 베타 결과는 참고용이며 공유할 수 없어요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "다시 저장" })).toHaveAttribute(
      "href",
      buildRequiredConsentHref(resultHref),
    );
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([url, init]) =>
            url === "/api/claim-result" && init?.method === "POST",
        ),
      ).toHaveLength(1);
    });
  });

  it("tombstones a server-deleted result instead of retrying its claim", async () => {
    const attempt = buildCompletedAttempt(candidateFullCoreAssessment);
    attempt.id = "local_deleted_claim";
    storageMock.getLocalAttempt.mockResolvedValue(attempt);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: null,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            code: "result_deleted",
            ok: false,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 410,
          },
        ),
      );

    render(<LocalResultView localResultId="local_deleted_claim" />);

    expect(
      await screen.findByRole("heading", { name: "이미 삭제한 결과예요" }),
    ).toBeInTheDocument();
    expect(storageMock.deleteLocalAttempt).toHaveBeenCalledWith(
      "local_deleted_claim",
    );
    expect(screen.queryByRole("link", { name: "다시 저장" })).toBeNull();
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => url === "/api/claim-result" && init?.method === "POST",
      ),
    ).toHaveLength(1);
  });

  it.each([
    {
      body: {
        authUserId: "auth-user-a",
        ok: true,
        result: {
          restored: false,
          resultReportId: "22222222-2222-4222-8222-222222222222",
        },
      },
      label: "saved",
      status: 200,
    },
    {
      body: {
        authUserId: "auth-user-a",
        code: "result_deleted",
        ok: false,
      },
      label: "deleted",
      status: 410,
    },
  ])(
    "does not adopt a $label claim response after the signed-in user changes",
    async ({ body, status }) => {
      const attempt = buildCompletedAttempt(candidateFullCoreAssessment);
      attempt.id = `local_scope_change_${status}`;
      storageMock.getLocalAttempt.mockResolvedValue(attempt);
      fetchMock
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              authUserId: "auth-user-a",
              ok: true,
              result: null,
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        )
        .mockImplementationOnce(async () => {
          authScopeMock.currentUserId = "auth-user-b";
          return new Response(JSON.stringify(body), {
            headers: { "content-type": "application/json" },
            status,
          });
        });

      render(<LocalResultView localResultId={attempt.id} />);

      expect(
        await screen.findByText(
          "계정 저장은 잠시 뒤 다시 시도해요. 이 베타 결과는 참고용이며 공유할 수 없어요.",
        ),
      ).toBeInTheDocument();
      expect(storageMock.deleteLocalAttempt).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("heading", { name: "이미 삭제한 결과예요" }),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps candidate sharing unavailable after a temporary account-save error", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          analytics: false,
          is14OrOlder: true,
          marketing: false,
          privacy: true,
          terms: true,
        }),
      ),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: null,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authUserId: "auth-user-a", ok: false }), {
          headers: { "content-type": "application/json" },
          status: 503,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: {
              resultReportId: "22222222-2222-4222-8222-222222222222",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    render(<LocalResultView localResultId="local_full" />);

    expect(
      await screen.findByText(
        "계정 저장은 잠시 뒤 다시 시도해요. 이 베타 결과는 참고용이며 공유할 수 없어요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "검사 결과 공유" }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => url === "/api/claim-result" && init?.method === "POST",
      ),
    ).toHaveLength(1);
  });

  it("does not request a common share link for a candidate result", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          analytics: false,
          is14OrOlder: true,
          marketing: false,
          privacy: true,
          terms: true,
        }),
      ),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: null,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: {
              resultReportId: "22222222-2222-4222-8222-222222222222",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            persistent: true,
            url: "http://localhost:3000/share/core-token",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );

    render(<LocalResultView localResultId="local_full" />);

    expect(await screen.findByText("참고용 · 공유 불가")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "검사 결과 공유" }),
    ).not.toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("report-share-links"),
      ),
    ).toBe(false);
  });

  it("restores saved report status without exposing share management", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          result: {
            activeShareLinkCount: 2,
            activeShareLinks: [
              {
                expiresAt: "2026-08-07T00:00:00.000Z",
                id: "33333333-3333-4333-8333-333333333333",
              },
              {
                expiresAt: "2026-08-01T00:00:00.000Z",
                id: "44444444-4444-4444-8444-444444444444",
              },
            ],
            assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
            claimedAt: "2026-07-08T00:00:00.000Z",
            latestShareExpiresAt: "2026-08-07T00:00:00.000Z",
            profileCode: "TVOAE",
            profileName: "불꽃의 온기 탐험가",
            resultReportId: "22222222-2222-4222-8222-222222222222",
          },
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    render(<LocalResultView localResultId="local_full" />);

    expect(await screen.findByText("참고용 · 공유 불가")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "검사 결과 공유" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/활성 공유 링크/)).not.toBeInTheDocument();
    expect(screen.queryByText("공유 링크 관리")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/계정에 저장|이 기기|로컬 결과/),
    ).not.toBeInTheDocument();
  });

  it("does not delete the local result when the signed-in user changes during server deletion", async () => {
    const user = userEvent.setup();
    const attempt = buildCompletedAttempt(candidateFullCoreAssessment);
    storageMock.getLocalAttempt.mockResolvedValue(attempt);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authUserId: "auth-user-a",
            ok: true,
            result: {
              resultReportId: "22222222-2222-4222-8222-222222222222",
            },
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockImplementationOnce(async () => {
        authScopeMock.currentUserId = "auth-user-b";
        return new Response(
          JSON.stringify({ authUserId: "auth-user-a", ok: true }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        );
      });

    render(<LocalResultView localResultId={attempt.id} />);

    await user.click(
      await screen.findByRole("button", { name: "이 결과 삭제" }),
    );

    expect(
      await screen.findByText(
        "결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(storageMock.deleteLocalAttempt).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
    const deleteCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/account-results" && init?.method === "DELETE",
    );
    expect(deleteCall?.[1]?.headers).toMatchObject({
      "x-nuang-auth-user-id": "auth-user-a",
    });
  });

  it("does not recalculate, claim, or share a result without its versioned snapshot", async () => {
    const legacyAttempt = buildCompletedAttempt(quickCoreAssessment);
    delete legacyAttempt.resultSnapshot;
    storageMock.getLocalAttempt.mockResolvedValue(legacyAttempt);

    render(<LocalResultView localResultId="local_quick" />);

    expect(
      await screen.findByRole("heading", {
        name: "이 결과는 현재 버전에서 다시 열 수 없어요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("-----")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /공유/ }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === "/api/claim-result" && init?.method === "POST",
      ),
    ).toBe(false);
  });

  it("blocks a result when its response hash or supported release versions do not match", async () => {
    const corrupted = buildCompletedAttempt(quickCoreAssessment);
    corrupted.resultSnapshot = {
      ...corrupted.resultSnapshot!,
      responseSnapshotHash: "different_snapshot",
    };
    storageMock.getLocalAttempt.mockResolvedValue(corrupted);

    render(<LocalResultView localResultId="local_quick" />);

    expect(
      await screen.findByRole("heading", {
        name: "이 결과는 현재 버전에서 다시 열 수 없어요",
      }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url === "/api/claim-result" && init?.method === "POST",
      ),
    ).toBe(false);
  });

  it("does not reinterpret an unsupported scoring release", async () => {
    const unsupported = buildCompletedAttempt(quickCoreAssessment);
    unsupported.resultSnapshot = {
      ...unsupported.resultSnapshot!,
      scoringModelVersion: "UNSUPPORTED-SCORING-MODEL",
    };
    storageMock.getLocalAttempt.mockResolvedValue(unsupported);

    render(<LocalResultView localResultId="local_quick" />);

    expect(
      await screen.findByRole("heading", {
        name: "이 결과는 현재 버전에서 다시 열 수 없어요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /공유/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the candidate 5-code report without any sharing surface or side effect", async () => {
    const user = userEvent.setup();
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(betaCoreAssessment),
    );

    render(<LocalResultView localResultId="local_beta" />);

    expect(
      await screen.findByRole("heading", {
        name: "관계를 여는 선도자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expectFiveCodeTabs();
    expect(
      screen.queryByRole("button", { name: /공유|카카오|피드/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /공유/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByText("결과를 이해하는 방법"));
    expect(
      screen.getByText(/확률·사람들 사이의 순위·능력 점수가 아니에요/),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          String(url).includes("claim-result") ||
          String(url).includes("share") ||
          String(url).includes("feed"),
      ),
    ).toBe(false);
  });

  it("opens a completed candidate quick result in the new five-code report", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateQuickCoreAssessment),
    );

    render(<LocalResultView localResultId="local_candidate_quick" />);

    expect(
      await screen.findByRole("heading", {
        name: "관계를 여는 선도자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expectFiveCodeTabs();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes("claim-result") && init?.method === "POST",
      ),
    ).toBe(false);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("claim-result?localResultId="),
        ),
      ).toBe(true);
    });
    expect(
      screen.queryByRole("button", { name: "공유" }),
    ).not.toBeInTheDocument();
  });

  it("opens a completed candidate precision result as the finished full flow", async () => {
    storageMock.getLocalAttempt.mockResolvedValue(
      buildCompletedAttempt(candidateFullCoreAssessment),
    );

    render(<LocalResultView localResultId="local_candidate_full" />);

    expect(
      await screen.findByRole("heading", {
        name: "관계를 여는 선도자, 뉴앙 코드 ENAKQ",
      }),
    ).toBeInTheDocument();
    expectFiveCodeTabs();
  });

  it("withholds a candidate report when any code position is centered", async () => {
    const user = userEvent.setup();
    const attempt = buildUndeterminedBetaAttempt();
    delete attempt.completionStatus;
    delete attempt.resultCopyVersion;
    delete attempt.resultEvidenceStatus;
    delete attempt.resultSnapshot;
    storageMock.getLocalAttempt.mockResolvedValue(attempt);

    render(<LocalResultView localResultId="local_beta_centered" />);

    expect(
      await screen.findByRole("heading", {
        name: "비슷하게 나온 코드만 조금 더 확인할게요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("ENAKQ")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "추가 질문 이어가기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "나중에 이어하기" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "추가 질문 이어가기" }),
    );
    expect(storageMock.startLocalAdaptiveFollowUp).toHaveBeenCalledWith(
      attempt,
      betaCoreAssessment.adaptiveItems!.map((item) => item.itemId),
    );
    expect(storageMock.beginLocalAdaptiveFollowUp).toHaveBeenCalledTimes(1);
    expect(routerMock.replace).toHaveBeenCalledWith(
      "/assessments/nu-core-full?preview=beta-v1",
    );
  });

  it("withholds a report and reopens base questions for one repeated answer pattern", async () => {
    const user = userEvent.setup();
    const attempt = buildCompletedAttempt(betaCoreAssessment);
    for (const item of betaCoreAssessment.items) {
      attempt.responses[item.itemId] = {
        answeredAt: attempt.updatedAt,
        itemId: item.itemId,
        value: 5,
      };
    }
    storageMock.getLocalAttempt.mockResolvedValue(attempt);

    render(<LocalResultView localResultId="local_beta_uniform" />);

    expect(
      await screen.findByRole("heading", {
        name: "답을 한 번만 더 살펴봐 주세요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "답 다시 살펴보기" }));
    expect(storageMock.reopenLocalAttemptForReview).toHaveBeenCalledWith(
      attempt,
      0,
    );
    expect(routerMock.replace).toHaveBeenCalledWith(
      "/assessments/nu-core-full?preview=beta-v1",
    );
  });
});

function buildCompletedAttempt(
  assessment: AssessmentDefinition,
): LocalAssessmentAttempt {
  const now = new Date("2026-07-08T00:00:00.000Z").toISOString();
  const responses = Object.fromEntries(
    assessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: now,
        isUnsure: false,
        itemId: item.itemId,
        value:
          assessment.assessmentId === betaCoreAssessment.assessmentId ||
          assessment.releaseId === candidateQuickCoreAssessment.releaseId ||
          assessment.releaseId === candidateFullCoreAssessment.releaseId
            ? item.isReverse
              ? (1 as const)
              : (5 as const)
            : (4 as const),
      },
    ]),
  );
  const scoringRelease =
    assessment.assessmentId === betaCoreAssessment.assessmentId
      ? betaScoringRelease
      : assessment.releaseId === candidateQuickCoreAssessment.releaseId
        ? candidateQuickScoringRelease
        : assessment.releaseId === candidateFullCoreAssessment.releaseId
          ? candidateFullScoringRelease
          : assessment.mode === "full"
            ? fullScoringRelease
            : quickScoringRelease;
  const scoreResult = calculateCoreScore(
    scoringRelease,
    Object.values(responses),
  );

  const attempt: LocalAssessmentAttempt = {
    assessmentId: assessment.assessmentId,
    completionRequestId: "completion_test",
    completionStatus: "completed",
    completedAt: now,
    createdAt: now,
    currentIndex: assessment.items.length - 1,
    expiresAt: new Date("2026-08-07T00:00:00.000Z").toISOString(),
    id: `local_${assessment.assessmentId}`,
    itemIds: assessment.items.map((item) => item.itemId),
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responseSnapshotHash: "pending",
    responses,
    resultCopyVersion: "core-result-copy.v0.1",
    resultEvidenceStatus: "clear",
    resultSnapshot: {
      assessmentReleaseId: assessment.releaseId,
      codeSchemeVersion: scoringRelease.codeSchemeVersion,
      createdAt: now,
      responseSnapshotHash: "pending",
      resultCopyVersion: "core-result-copy.v0.1",
      resultStatus: "ready",
      scoreResult,
      scoringModelVersion: scoringRelease.scoringModelVersion,
      scoringReleaseId: scoringRelease.scoringReleaseId,
    },
    state: "completed",
    updatedAt: now,
  };

  const responseSnapshotHash = createResponseSnapshotHash(assessment, attempt);
  attempt.responseSnapshotHash = responseSnapshotHash;
  attempt.resultSnapshot!.responseSnapshotHash = responseSnapshotHash;

  return attempt;
}

function buildUndeterminedBetaAttempt() {
  const attempt = buildCompletedAttempt(betaCoreAssessment);
  const indexByDomain = new Map<string, number>();
  const centeredResponses = Object.fromEntries(
    betaCoreAssessment.items.map((item) => {
      const domainIndex = indexByDomain.get(item.domainId) ?? 0;
      indexByDomain.set(item.domainId, domainIndex + 1);
      const scoresHigh = domainIndex % 2 === 0;

      return [
        item.itemId,
        {
          answeredAt: attempt.updatedAt,
          isUnsure: false,
          itemId: item.itemId,
          value: scoresHigh
            ? item.isReverse
              ? (1 as const)
              : (5 as const)
            : item.isReverse
              ? (5 as const)
              : (1 as const),
        },
      ];
    }),
  );
  const scoreResult = calculateCoreScore(
    betaScoringRelease,
    Object.values(centeredResponses),
  );

  attempt.responses = centeredResponses;
  attempt.resultEvidenceStatus = "near_boundary";
  attempt.resultSnapshot!.scoreResult = scoreResult;
  const responseSnapshotHash = createResponseSnapshotHash(
    betaCoreAssessment,
    attempt,
  );
  attempt.responseSnapshotHash = responseSnapshotHash;
  attempt.resultSnapshot!.responseSnapshotHash = responseSnapshotHash;

  return attempt;
}
