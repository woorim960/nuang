import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FreeTopicResultView } from "@/features/assessment/FreeTopicResultView";
import type { StoredFreeTopicResult } from "@/features/assessment/free-topic-storage";

const navigationMock = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
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
    navigationMock.router.refresh.mockClear();
    storageMock.loadFreeTopicResultLocalFirst.mockResolvedValue(createStoredResult());
    storageMock.syncFreeTopicResult.mockResolvedValue(createStoredResult());
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
      await screen.findByRole("heading", { name: "대화 온도 결과" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "이번 검사 요약" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "세부 해석" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "결과를 읽는 기준" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "피드에 공유" })).toBeInTheDocument();
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
      await screen.findByRole("heading", { name: "대화 온도 결과" }),
    ).toBeInTheDocument();
    expect(storageMock.syncFreeTopicResult).not.toHaveBeenCalled();
  });

  it("shares a free topic report to the feed without exposing raw answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: "피드에 공유" }));

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
      source: "free_text",
      sourceId: "conversation-temperature",
      visibility: "public",
    });
    expect(JSON.stringify(getLastFeedRequestBody())).not.toContain("answers");
    expect(JSON.stringify(getLastFeedRequestBody())).not.toContain("observations");
    expect(navigationMock.router.push).toHaveBeenCalledWith("/feed");
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
    localResultId: "topic_test_123",
    result: {
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
    },
    sync: { status: syncStatus },
  };
}
