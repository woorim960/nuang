import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportShareSheet } from "@/features/share/ReportShareSheet";
import {
  buildCoreReportShareContent,
  buildTopicReportShareContent,
} from "@/features/share/report-share-contract";

const content = buildTopicReportShareContent({
  assessmentTitle: "위로받을 때 필요한 것",
  highlights: [
    "방법 함께 찾기 88점",
    "내 속도와 선택 69점",
    "마음 알아주기 50점",
  ],
  resultName: "방법은 같이 찾고, 속도는 내가 정하고 싶어요",
  summary: "막막할 때는 해결 방법을 함께 정리하는 도움이 가장 크게 나타났어요.",
});

describe("ReportShareSheet", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the same complete action set and no partial image share", () => {
    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "결과 공유" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "링크 복사" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다른 앱으로 공유" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "커뮤니티에 공유" }),
    ).toBeInTheDocument();
    expect(screen.getByText("원본 결과 주소를 복사해요")).toBeInTheDocument();
    expect(screen.getByText("휴대폰의 공유창을 열어요")).toBeInTheDocument();
    expect(
      screen.getByText("내 한마디와 함께 피드에 올려요"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/이미지|캡처|캡쳐/)).not.toBeInTheDocument();
  });

  it("closes with Escape for keyboard users", () => {
    const onClose = vi.fn();
    render(
      <ReportShareSheet
        canonicalUrl="/feed/profiles/profile-1/reports/report-1"
        content={content}
        isOpen
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps every share action unavailable until the original report is saved", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByRole("button", { name: "링크 복사" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "다른 앱으로 공유" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "커뮤니티에 공유" }),
    ).toBeDisabled();
    expect(
      screen.getByText("먼저 로그인하고 결과를 계정에 저장해 주세요."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares the canonical original report URL without creating a summary link", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        canonicalUrl="/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111"
        content={content}
        isOpen
        onClose={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3000/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111",
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("검사 당시의 원본 결과 리포트를 그대로 공유해요."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("원본 리포트 링크를 복사했어요."),
    ).toBeInTheDocument();
  });

  it("resolves an owned server result to its original profile report URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          persistent: true,
          url: "http://localhost:3000/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111",
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        onNavigate={onNavigate}
        originalReportKey="topic_11111111-1111-4111-8111-111111111111"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/report-share-links",
        expect.objectContaining({
          body: JSON.stringify({
            reportKey: "topic_11111111-1111-4111-8111-111111111111",
          }),
          method: "POST",
        }),
      );
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost:3000/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111",
    );
  });

  it("creates an expiring summary token for a core result link", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          shareLink: { url: "http://localhost:3000/share/core-token" },
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={buildCoreReportShareContent({
          code: "ENAKQ",
          highlights: ["혼자 정리한 뒤 대화를 시작해요"],
          profileName: "차분한 탐색가",
          resultLabel: "나의 뉴앙 코드 결과",
          summary: "생각을 충분히 정리한 뒤 움직이는 편이에요.",
        })}
        isOpen
        onClose={vi.fn()}
        originalReportKey="core_11111111-1111-4111-8111-111111111111"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/share-links",
        expect.objectContaining({
          body: JSON.stringify({
            resultReportId: "11111111-1111-4111-8111-111111111111",
            ttlDays: 30,
            visibility: "summary",
          }),
          method: "POST",
        }),
      );
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3000/share/core-token",
      );
    });
  });

  it("previews an optional note before sharing the original report to the community", async () => {
    const fetchMock = vi.fn(
      async (input: string | URL | Request, _init?: RequestInit) => {
        void _init;
        const url = String(input);
        if (url === "/api/report-share-links") {
          return new Response(
            JSON.stringify({
              ok: true,
              persistent: true,
              url: "http://localhost:3000/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111",
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          );
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        onNavigate={onNavigate}
        originalReportKey="topic_11111111-1111-4111-8111-111111111111"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "커뮤니티에 공유" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("피드에 올라갈 내용을 확인해 주세요."),
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("이 결과를 보고 든 생각을 남겨보세요."),
      { target: { value: "지금의 나와 정말 닮은 결과예요." } },
    );
    expect(screen.getAllByText("지금의 나와 정말 닮은 결과예요.")).toHaveLength(
      2,
    );

    fireEvent.click(screen.getByRole("button", { name: "커뮤니티에 공유" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/feed",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const feedCall = fetchMock.mock.calls.find(
      ([input]) => String(input) === "/api/feed",
    );
    const requestBody = JSON.parse(
      String((feedCall?.[1] as RequestInit | undefined)?.body),
    );
    expect(requestBody).toMatchObject({
      action: "create_post",
      attachments: [
        {
          id: "topic_11111111-1111-4111-8111-111111111111",
          profileId: "profile-1",
          type: "original_report",
        },
      ],
      source: "report_share",
      sourceId: "topic_11111111-1111-4111-8111-111111111111",
      visibility: "public",
    });
    expect(requestBody.body).toBe("지금의 나와 정말 닮은 결과예요.");
    expect(JSON.stringify(requestBody)).not.toMatch(
      /answers|responses|observations/,
    );
    expect(onNavigate).toHaveBeenCalledWith("/feed");
  });

  it("prefills the selected result sentence in the community note", () => {
    render(
      <ReportShareSheet
        canonicalUrl="/feed/profiles/profile-1/reports/report-1"
        content={content}
        initialCommunityNote="“생각을 정리한 뒤 대화를 시작해요.”"
        isOpen
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "커뮤니티에 공유" }));

    expect(
      screen.getByPlaceholderText("이 결과를 보고 든 생각을 남겨보세요."),
    ).toHaveValue("“생각을 정리한 뒤 대화를 시작해요.”");
  });

  it.each([
    ["core", "코어 검사 결과 미리보기"],
    ["topic", "주제 검사 결과 미리보기"],
    ["lab", "별난 연구소 결과 미리보기"],
  ] as const)(
    "labels the %s result preview without relying on color",
    (reportType, label) => {
      render(
        <ReportShareSheet
          canonicalUrl="/feed/profiles/profile-1/reports/report-1"
          content={{ ...content, reportType }}
          isOpen
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByRole("region", { name: label })).toHaveAttribute(
        "data-report-type",
        reportType,
      );
    },
  );
});
