import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FreeTopicResultView } from "@/features/assessment/FreeTopicResultView";
import {
  buildFreeTopicResultReport,
  calculateFreeTopicResult,
  getFreeTopicAssessment,
  getFreeTopicQuestions,
  type FreeTopicAnswer,
} from "@/features/assessment/free-topic-assessments";
import {
  freeTopicReportContentVersion,
  freeTopicResultFormatVersion,
  freeTopicScoringVersion,
  getFreeTopicInstrumentVersion,
  getFreeTopicReportContentVersion,
  getFreeTopicScoringVersion,
} from "@/features/assessment/free-topic-result-version";
import type { StoredFreeTopicResult } from "@/features/assessment/free-topic-storage";

const navigationMock = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  },
}));

const storageMock = vi.hoisted(() => ({
  loadFreeTopicResultLocalFirst: vi.fn(),
  syncFreeTopicResult: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigationMock.router,
}));

vi.mock("@/features/assessment/free-topic-storage", () => ({
  loadFreeTopicResultLocalFirst: storageMock.loadFreeTopicResultLocalFirst,
  syncFreeTopicResult: storageMock.syncFreeTopicResult,
}));

describe("FreeTopicResultView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMock.router.push.mockClear();
    navigationMock.router.replace.mockClear();
    navigationMock.router.refresh.mockClear();
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(
      createStoredResult(),
    );
    storageMock.syncFreeTopicResult.mockResolvedValue(
      createStoredResult({ syncStatus: "synced" }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a professional user-facing report without internal trait keys", async () => {
    render(
      <FreeTopicResultView
        localResultId="topic_test_123"
        slug="conversation-temperature"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "대화 온도" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "세부 결과" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("이번 검사 요약")).not.toBeInTheDocument();
    expect(screen.queryByText("결과를 읽는 기준")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "점수 뜻" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "검사 결과 공유" }),
    ).toBeInTheDocument();
    expect(screen.getByText("상대 마음 살피기")).toBeInTheDocument();
    expect(screen.getByText("기준과 선택 존중")).toBeInTheDocument();
    expect(screen.getByText("먼저 말 꺼내기")).toBeInTheDocument();

    await waitFor(() => {
      expect(storageMock.syncFreeTopicResult).toHaveBeenCalled();
    });

    const renderedText = document.body.textContent ?? "";
    expect(renderedText).not.toContain("RO-EC");
    expect(renderedText).not.toContain("RO-RN");
    expect(renderedText).not.toContain("SE-AI");
    expect(renderedText).not.toContain("facet:");
  });

  it("does not re-sync a result restored from the server", async () => {
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(
      createStoredResult({ syncStatus: "synced" }),
    );

    render(
      <FreeTopicResultView
        localResultId="topic_test_123"
        slug="conversation-temperature"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "대화 온도" }),
    ).toBeInTheDocument();
    expect(storageMock.syncFreeTopicResult).not.toHaveBeenCalled();
  });

  it("offers result-saving login after a guest topic report is visible", async () => {
    const guestResult = createStoredResult({ syncStatus: "failed" });
    guestResult.sync.lastError = "login_required";
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(guestResult);
    storageMock.syncFreeTopicResult.mockResolvedValue(guestResult);

    render(
      <FreeTopicResultView
        localResultId="topic_test_123"
        slug="conversation-temperature"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "로그인하고 이번 결과를 내 기록에 이어가세요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "로그인하고 결과 저장" }),
    ).toHaveAttribute(
      "href",
      "/login?reason=result_save&next=%2Fassessments%2Ftopics%2Fconversation-temperature%2Fresult%2Ftopic_test_123",
    );
  });

  it("keeps the personalized copy frozen for a released result", async () => {
    const stored = createStoredResult({ syncStatus: "synced" });
    stored.productReleaseId = "11111111-1111-4111-8111-111111111111";
    stored.reportSnapshot.personalizedSummary = {
      body: "이 문장은 검사를 마친 시점에 확정된 설명이에요.",
      eyebrow: "완료 당시 결과",
      steps: [],
      title: "완료 당시의 내 대화 성향",
    };

    render(
      <FreeTopicResultView
        initialResult={stored}
        localResultId={stored.localResultId}
        slug="conversation-temperature"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "완료 당시의 내 대화 성향",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("이 문장은 검사를 마친 시점에 확정된 설명이에요."),
    ).toBeInTheDocument();
  });

  it("shares a free topic report to the feed without exposing raw answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/report-share-links") {
          return new Response(
            JSON.stringify({
              ok: true,
              url: "http://localhost:3000/feed/profiles/22222222-2222-4222-8222-222222222222/reports/topic_11111111-1111-4111-8111-111111111111",
            }),
            {
              headers: {
                "content-type": "application/json",
              },
              status: 200,
            },
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        });
      }),
    );

    render(
      <FreeTopicResultView
        localResultId="topic_test_123"
        slug="conversation-temperature"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "검사 결과 공유" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "커뮤니티에 공유" }),
    );
    await screen.findByRole("dialog", { name: "커뮤니티에 공유" });
    fireEvent.click(screen.getByRole("button", { name: "커뮤니티에 공유" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/feed",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
    expect(getLastFeedRequestBody()).toMatchObject({
      action: "create_post",
      attachments: [
        {
          id: "topic_11111111-1111-4111-8111-111111111111",
          profileId: "22222222-2222-4222-8222-222222222222",
          type: "original_report",
        },
      ],
      source: "report_share",
      visibility: "public",
    });
    expect(JSON.stringify(getLastFeedRequestBody())).not.toContain("answers");
    expect(JSON.stringify(getLastFeedRequestBody())).not.toContain(
      "observations",
    );
  });

  it("renders the professional long report when a 12-item topic has enough evidence", async () => {
    const stored = createStoredResult({ syncStatus: "synced" });
    stored.assessment = {
      categoryId: "relationship",
      categoryLabel: "관계",
      slug: "apology-style",
      title: "사과할 때 나는 어떻게 풀어갈까?",
    };
    stored.result.scoresByScaleId = {
      impact_listening: 75,
      repair_planning: 50,
      responsibility_acknowledgement: 25,
    };
    stored.instrumentVersion = getFreeTopicInstrumentVersion("apology-style");
    stored.reportSnapshot = buildFreeTopicResultReport({
      assessment: getFreeTopicAssessment("apology-style")!,
      result: stored.result,
    });
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(stored);

    render(
      <FreeTopicResultView
        localResultId="topic_apology_123"
        slug="apology-style"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "사과할 때 나는 어떻게 풀어갈까?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "결과 더 자세히 보기",
      }),
    ).toBeInTheDocument();
    expect(document.body.textContent).toContain("핵심 요약");
    expect(document.body.textContent).toContain("행동 해석");
    expect(document.body.textContent).toContain("핵심 진단");
    expect(
      screen.getByRole("heading", {
        name: "사람에 따라 이렇게 적용해 보세요",
      }),
    ).toBeInTheDocument();
    expect(
      document.body.textContent?.replace(/\s/g, "").length,
    ).toBeGreaterThan(2_000);
  });

  it("renders the published operator strength, caution, and action for the scored level", async () => {
    const assessment = structuredClone(
      getFreeTopicAssessment("apology-style")!,
    );
    const scale = assessment.reportScales?.find(
      (item) => item.id === "responsibility_acknowledgement",
    );
    expect(scale).toBeDefined();
    scale!.highStrength = "책임을 구체적으로 인정해 대화의 출발점을 만들어요.";
    scale!.highWatch =
      "모든 책임을 혼자 떠안는 방식으로 흐르지 않도록 살펴보세요.";
    scale!.highAction = "인정한 내용과 다음 행동을 한 문장씩 나눠 말해 보세요.";
    const stored = createStoredResult({ syncStatus: "synced" });
    stored.assessment = {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    };
    stored.result.scoresByScaleId = {
      impact_listening: 50,
      repair_planning: 50,
      responsibility_acknowledgement: 75,
    };
    stored.reportSnapshot = buildFreeTopicResultReport({
      assessment,
      result: stored.result,
    });

    render(
      <FreeTopicResultView
        assessmentOverride={assessment}
        initialResult={stored}
        localResultId="topic_operator_copy_123"
        questionsOverride={getFreeTopicQuestions(assessment.slug)}
        slug={assessment.slug}
      />,
    );

    const detail = await screen.findByRole("heading", {
      name: "내가 놓친 점 인정하기에서 보이는 강점과 보완점",
    });
    fireEvent.click(detail);
    expect(
      screen.getByText("책임을 구체적으로 인정해 대화의 출발점을 만들어요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("인정한 내용과 다음 행동을 한 문장씩 나눠 말해 보세요."),
    ).toBeInTheDocument();
  });

  it("restores the current reviewed long report for an older published result", async () => {
    const assessment = getFreeTopicAssessment("apology-style")!;
    const stored = createStoredResult({ syncStatus: "synced" });
    stored.assessment = {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    };
    stored.assessmentSnapshot = assessment;
    stored.productReleaseId = "11111111-1111-4111-8111-111111111111";
    stored.result.scoresByScaleId = {
      impact_listening: 50,
      repair_planning: 50,
      responsibility_acknowledgement: 75,
    };
    stored.reportSnapshot = {
      ...buildFreeTopicResultReport({
        assessment,
        result: stored.result,
      }),
      longReportSections: [],
    };

    render(
      <FreeTopicResultView
        initialResult={stored}
        localResultId="topic_apology_old_snapshot"
        slug={assessment.slug}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "사람에 따라 이렇게 적용해 보세요",
      }),
    ).toBeInTheDocument();
    expect(
      document.body.textContent?.replace(/\s/g, "").length,
    ).toBeGreaterThan(2_000);
  });

  it("uses the recharge recall period and score meaning on the result", async () => {
    const assessment = getFreeTopicAssessment("recharge-routine")!;
    const completedAt = "2026-07-29T00:00:00.000Z";
    const answers = Object.fromEntries(
      getFreeTopicQuestions(assessment.slug).map((question) => [
        question.id,
        {
          answeredAt: completedAt,
          questionId: question.id,
          value: 4,
        } satisfies FreeTopicAnswer,
      ]),
    );
    const rechargeResult = calculateFreeTopicResult({
      answers,
      assessment,
      observedAt: completedAt,
    });
    const stored = createStoredResult({ syncStatus: "synced" });
    stored.answers = answers;
    stored.assessment = {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    };
    stored.instrumentVersion = getFreeTopicInstrumentVersion(assessment.slug);
    stored.reportContentVersion = getFreeTopicReportContentVersion(
      assessment.slug,
    );
    stored.reportSnapshot = buildFreeTopicResultReport({
      assessment,
      result: rechargeResult,
    });
    stored.result = rechargeResult;
    stored.scoringVersion = getFreeTopicScoringVersion(assessment.slug);
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(stored);

    render(
      <FreeTopicResultView
        localResultId="topic_recharge_123"
        slug="recharge-routine"
      />,
    );

    expect(
      await screen.findByText("최근 4주 · 4가지 상황 · 12개 질문"),
    ).toBeInTheDocument();
    const closePersonGuide = screen.getByRole("region", {
      name: "가까운 사람이 도와주는 방법",
    });
    expect(
      within(closePersonGuide).getByText("곁에서 돕는 방법"),
    ).toBeInTheDocument();
    ["조용히 쉬기", "편한 사람과 연결하기", "작게 움직이기"].forEach(
      (label) => {
        expect(
          within(closePersonGuide).getByText(label).closest("dt"),
        ).not.toBeNull();
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "점수 뜻" }));
    expect(
      screen.getByText(/최근 4주의 피로 장면에서 조용히 쉬고/),
    ).toBeInTheDocument();
  });

  it("renders the focus-switch report as three independent return actions", async () => {
    const assessment = getFreeTopicAssessment("focus-switch")!;
    const completedAt = "2026-07-29T01:00:00.000Z";
    const answers = Object.fromEntries(
      getFreeTopicQuestions(assessment.slug).map((question) => [
        question.id,
        {
          answeredAt: completedAt,
          questionId: question.id,
          value: 4,
        } satisfies FreeTopicAnswer,
      ]),
    );
    const focusResult = calculateFreeTopicResult({
      answers,
      assessment,
      observedAt: completedAt,
    });
    const stored = createStoredResult({ syncStatus: "synced" });
    stored.answers = answers;
    stored.assessment = {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    };
    stored.instrumentVersion = getFreeTopicInstrumentVersion(assessment.slug);
    stored.reportContentVersion = getFreeTopicReportContentVersion(
      assessment.slug,
    );
    stored.reportSnapshot = buildFreeTopicResultReport({
      assessment,
      result: focusResult,
    });
    stored.result = focusResult;
    stored.scoringVersion = getFreeTopicScoringVersion(assessment.slug);
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(stored);

    render(
      <FreeTopicResultView
        localResultId="topic_focus_123"
        slug="focus-switch"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "집중이 끊기면 나는 어떻게 다시 시작할까?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("최근 4주 · 4가지 상황 · 12개 질문"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "가까운 사람이 도와주는 방법" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "점수 뜻" }));
    expect(
      screen.getByText(
        /최근 4주에 집중이 끊긴 장면에서 다시 시작할 지점을 남기고/,
      ),
    ).toBeInTheDocument();
  });

  it("shows an exact personalized comfort recipe and separates support from delivery", async () => {
    const stored = createComfortStoredResult();
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(stored);

    render(
      <FreeTopicResultView
        localResultId={stored.localResultId}
        slug="comfort-style"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "방법은 같이 찾고, 속도는 내가 정하고 싶어요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("어떤 도움이 필요했나요?")).toBeInTheDocument();
    expect(screen.getByText("어떻게 도움받고 싶었나요?")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "방법과 실질 도움" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "내 속도와 공간" }),
    ).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getAllByText("매우 필요했어요").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "장면별로 달랐던 부분" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "사람에 따라 이렇게 말해 보세요" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("heading", { name: "장면별로 달랐던 부분" })
        .closest("details"),
    ).toHaveAttribute("open");
    expect(
      screen
        .getByRole("heading", { name: "사람에 따라 이렇게 말해 보세요" })
        .closest("details"),
    ).not.toHaveAttribute("open");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("이 결과를 계산한 방법")).not.toBeInTheDocument();
  });

  it("repairs historical hurt-expression copy and separates labels from levels", async () => {
    const stored = createHistoricalHurtStoredResult();
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(stored);

    render(
      <FreeTopicResultView
        localResultId={stored.localResultId}
        slug="hurt-expression"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "서운했던 일을 짚고 다음에는 어떻게 해주길 바라는지 말해요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "상대의 성격이나 의도를 단정하기보다 실제로 어떤 일이 서운했는지 구체적인 장면을 짚어 말하는 편이에요. ‘내 마음 전하기’는 다른 표현보다 말할 상황을 더 타는 편이었어요.",
      ),
    ).toBeInTheDocument();

    ["서운한 일 짚기", "내 마음 전하기", "바라는 변화 말하기"].forEach(
      (label) => {
        const labelElement = screen.getByText(label);
        const row = labelElement.closest("li");
        expect(row).not.toBeNull();
        expect(
          within(row as HTMLLIElement).getByText("자주 했어요"),
        ).toBeInTheDocument();
      },
    );
    expect(screen.queryByText(/서운했던 일 말하기 ·/)).not.toBeInTheDocument();
  });

  it("keeps a legacy 12-question organizing result compatible with the new four-dimension report", async () => {
    const stored = createHistoricalOrganizingStoredResult();
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(stored);

    render(
      <FreeTopicResultView
        localResultId={stored.localResultId}
        slug="organizing-style"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "나는 일상을 어떻게 정리할까?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("최근 4주 · 4가지 상황 · 12개 질문"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "강점과 약점, 다음 개선점",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("답할 경험이 적었던 항목은 결과에서 제외했어요."),
    ).not.toBeInTheDocument();
  });

  it("redacts legacy core identity from an older local topic report", async () => {
    const stored = createComfortStoredResult();
    stored.nuangCodeContext = {
      capturedAt: stored.completedAt,
      code: "INGMC",
    };
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(stored);

    render(
      <FreeTopicResultView
        localResultId={stored.localResultId}
        slug="comfort-style"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "위로받을 때 필요한 것" }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("INGMC");
    expect(
      screen.queryByRole("link", { name: "내 성향지도에서 더 자세히 보기" }),
    ).not.toBeInTheDocument();
  });

  it("redacts both owner and viewer core codes from a shared topic report", async () => {
    const ownerResult = createComfortStoredResult();
    ownerResult.nuangCodeContext = {
      capturedAt: ownerResult.completedAt,
      code: "INGMC",
    };
    const viewerResult = createComfortStoredResult();
    viewerResult.nuangCodeContext = {
      capturedAt: viewerResult.completedAt,
      code: "ENGMQ",
    };
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(viewerResult);

    render(
      <FreeTopicResultView
        backHref="/feed/profiles/profile-1?tab=reports"
        initialResult={ownerResult}
        localResultId={ownerResult.localResultId}
        readOnly
        slug="comfort-style"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "위로받을 때 필요한 것" }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("INGMC");
    expect(document.body.textContent).not.toContain("ENGMQ");
    expect(storageMock.loadFreeTopicResultLocalFirst).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "프로필로 돌아가기" }),
    ).toHaveAttribute("href", "/feed/profiles/profile-1?tab=reports");
  });

  it("never renders one assessment result with another assessment route", async () => {
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(
      createStoredResult({ syncStatus: "synced" }),
    );

    render(
      <FreeTopicResultView
        localResultId="topic_test_123"
        slug="apology-style"
      />,
    );

    await waitFor(() => {
      expect(navigationMock.router.replace).toHaveBeenCalledWith(
        "/assessments/topics/conversation-temperature/result/topic_test_123",
      );
    });
    expect(
      screen.queryByRole("heading", {
        name: "사과할 때 나는 어떻게 풀어갈까?",
      }),
    ).not.toBeInTheDocument();
  });
});

function getLastFeedRequestBody() {
  const mockedFetch = vi.mocked(fetch);
  const lastCall = mockedFetch.mock.calls.at(-1);
  const init = lastCall?.[1] as RequestInit | undefined;

  return JSON.parse(String(init?.body));
}

function createStoredResult({
  syncStatus = "queued",
}: {
  syncStatus?: StoredFreeTopicResult["sync"]["status"];
} = {}): StoredFreeTopicResult {
  const assessment = getFreeTopicAssessment("conversation-temperature")!;
  const result: StoredFreeTopicResult["result"] = {
    observations: [
      {
        approvalStatus: "approved",
        constructDirectness: 0.9,
        id: "conversation-temperature:facet:RO-EC",
        measurementAmount: 1,
        observedAt: "2026-07-10T00:00:00.000Z",
        recency: 1,
        repetitionDiscount: 1,
        responseQuality: 1,
        score: 72,
        sourceKind: "free_topic",
        target: { kind: "facet", id: "RO-EC" },
      },
    ],
    scoresByTargetId: {
      "facet:RO-EC": 72,
      "facet:RO-RN": 50,
      "facet:SE-AI": 100,
    },
    summary: "여러 검사와 함께 누적되는 참고 결과예요.",
  };

  return {
    answers: {},
    assessment: {
      categoryId: "relationship",
      categoryLabel: "관계",
      slug: "conversation-temperature",
      title: "대화 온도",
    },
    completedAt: "2026-07-10T00:00:00.000Z",
    expiresAt: "2027-07-10T00:00:00.000Z",
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: getFreeTopicInstrumentVersion(assessment.slug),
    localResultId: "topic_test_123",
    reportContentVersion: freeTopicReportContentVersion,
    reportSnapshot: buildFreeTopicResultReport({ assessment, result }),
    result,
    scoringVersion: freeTopicScoringVersion,
    ...(syncStatus === "synced"
      ? {
          serverResultId: "11111111-1111-4111-8111-111111111111",
        }
      : {}),
    sync: { status: syncStatus },
  };
}

function createComfortStoredResult(): StoredFreeTopicResult {
  const assessment = getFreeTopicAssessment("comfort-style")!;
  const completedAt = "2026-07-28T10:00:00.000Z";
  const valuesByScale = {
    autonomy_pacing: [4, 4, 4, 3],
    collaborative_problem_solving: [5, 5, 4, 4],
    emotional_acknowledgement: [3, 3, 3, 3],
  };
  const cursorByScale: Record<string, number> = {};
  const answers = Object.fromEntries(
    getFreeTopicQuestions(assessment.slug).map((question) => {
      const scaleId = question.reportScaleId!;
      const cursor = cursorByScale[scaleId] ?? 0;
      cursorByScale[scaleId] = cursor + 1;
      return [
        question.id,
        {
          answeredAt: completedAt,
          questionId: question.id,
          value: valuesByScale[scaleId as keyof typeof valuesByScale][
            cursor
          ] as FreeTopicAnswer["value"],
        },
      ];
    }),
  );
  const result = calculateFreeTopicResult({
    answers,
    assessment,
    observedAt: completedAt,
  });

  return {
    answers,
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    completedAt,
    expiresAt: "2027-07-28T10:00:00.000Z",
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: getFreeTopicInstrumentVersion(assessment.slug),
    localResultId: "topic_comfort_123",
    reportContentVersion: getFreeTopicReportContentVersion(assessment.slug),
    reportSnapshot: buildFreeTopicResultReport({ assessment, result }),
    result,
    scoringVersion: getFreeTopicScoringVersion(assessment.slug),
    sync: { status: "synced" },
  };
}

function createHistoricalHurtStoredResult(): StoredFreeTopicResult {
  const assessment = getFreeTopicAssessment("hurt-expression")!;
  const completedAt = "2026-07-28T10:00:00.000Z";
  const result: StoredFreeTopicResult["result"] = {
    observations: [],
    scoresByScaleId: {
      change_request: 69,
      feeling_expression: 63,
      specific_event_expression: 81,
    },
    scoresByTargetId: {},
    summary: "최근 행동 기록",
  };
  const reportSnapshot = buildFreeTopicResultReport({ assessment, result });
  reportSnapshot.personalizedSummary = {
    body: "서운했던 일 말하기과 내 마음 말하기과 바라는 점 부탁하기는 상황에 따라 나타나는 정도가 크게 달랐어요. 점수뿐 아니라 어떤 장면에서 달라졌는지도 함께 보면 내 표현 방식을 더 구체적으로 이해할 수 있어요.",
    eyebrow: "서운할 때 나타난 말하기 행동",
    steps: [
      {
        label: "서운했던 일 말하기 · 자주 했어요",
        text: "마음에 걸린 말이나 행동이 무엇인지 구체적으로 말해요.",
      },
      {
        label: "내 마음 말하기 · 자주 했어요",
        text: "그 일로 내가 어떤 마음이 들었는지 말해요.",
      },
      {
        label: "바라는 점 부탁하기 · 자주 했어요",
        text: "다음에 어떻게 해 주면 좋을지 구체적으로 부탁해요.",
      },
    ],
    title: "서운했던 일 말하기와 바라는 점 부탁하기가 함께 자주 나타났어요",
  };

  return {
    answers: {},
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    completedAt,
    expiresAt: "2027-07-28T10:00:00.000Z",
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: getFreeTopicInstrumentVersion(assessment.slug),
    localResultId: "topic_hurt_historical_123",
    reportContentVersion: "hurt-expression-report-v2-frequency-safe",
    reportSnapshot,
    result,
    scoringVersion: getFreeTopicScoringVersion(assessment.slug),
    sync: { status: "synced" },
  };
}

function createHistoricalOrganizingStoredResult(): StoredFreeTopicResult {
  const assessment = getFreeTopicAssessment("organizing-style")!;
  const completedAt = "2026-07-28T10:00:00.000Z";
  const result: StoredFreeTopicResult["result"] = {
    observations: [],
    scoresByScaleId: {
      adaptive_reset: 100,
      stable_structure: 94,
      visible_capture: 81,
    },
    scoresByTargetId: {},
    summary: "최근 행동 기록",
  };
  const reportSnapshot = buildFreeTopicResultReport({ assessment, result });
  reportSnapshot.longReportSections = reportSnapshot.longReportSections?.filter(
    (section) =>
      !section.claimIds.some((claimId) => claimId.includes("direct-feedback")),
  );

  return {
    answers: {},
    assessment: {
      categoryId: assessment.categoryId,
      categoryLabel: assessment.categoryLabel,
      slug: assessment.slug,
      title: assessment.title,
    },
    completedAt,
    expiresAt: "2027-07-28T10:00:00.000Z",
    formatVersion: freeTopicResultFormatVersion,
    instrumentVersion: "organizing-style-v2-independent-scenes-2026-07-29",
    localResultId: "topic_organizing_historical_123",
    reportContentVersion: "organizing-style-report-v2-long-form",
    reportSnapshot,
    result,
    scoringVersion: "organizing-style-scoring-v2-independent-scenes",
    sync: { status: "synced" },
  };
}
