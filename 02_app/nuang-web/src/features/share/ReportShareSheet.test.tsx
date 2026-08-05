import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportShareSheet } from "@/features/share/ReportShareSheet";
import {
  buildCoreReportShareContent,
  buildTopicReportShareContent,
} from "@/features/share/report-share-contract";

const kakaoMocks = vi.hoisted(() => ({
  prepareImage: vi.fn(async () => "https://mud-kage.kakao.com/share.png"),
  send: vi.fn(async () => undefined),
}));
const shareAuthMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("@/features/share/kakao-talk-share", () => ({
  prepareKakaoReportShareImage: kakaoMocks.prepareImage,
  sendReportToKakaoTalk: kakaoMocks.send,
}));
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getUser: shareAuthMocks.getUser },
  }),
}));

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
    shareAuthMocks.getUser.mockResolvedValue({
      data: { user: { id: "account-1" } },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the exact public summary without exposing private score details", () => {
    render(
      <ReportShareSheet
        canonicalUrl="/feed/profiles/profile-1/reports/report-1"
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
      screen.getByRole("button", { name: "카카오톡으로 보내기" }),
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
    expect(
      screen.getByRole("region", { name: "주제 검사 공유 결과" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("카카오톡에서 보낼 대화방을 직접 선택해요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("답변, 연락처와 계정 정보는 공유되지 않아요."),
    ).toBeInTheDocument();
    expect(screen.getByText(content.summary)).toBeInTheDocument();
    content.highlights.forEach((highlight) => {
      expect(screen.queryByText(highlight)).not.toBeInTheDocument();
    });
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

  it("creates a safe summary link when a guest has no saved report", async () => {
    const guestUrl = "http://localhost:3000/share/g1.payload.signature";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, url: guestUrl }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByRole("button", { name: "링크 복사" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "카카오톡으로 보내기" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "다른 앱으로 공유" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "커뮤니티에 공유" }),
    ).toBeEnabled();
    expect(
      screen.getByText("결과 요약을 안전하게 공유해요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/guest-report-share-links",
        expect.objectContaining({
          body: JSON.stringify({ content }),
          method: "POST",
        }),
      );
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(guestUrl);
    });
  });

  it("opens Kakao Talk for a guest with the signed summary link", async () => {
    const guestUrl = "https://nuang.app/share/g1.payload.signature";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, url: guestUrl }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      ),
    );

    render(<ReportShareSheet content={content} isOpen onClose={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "카카오톡으로 보내기" }),
    );

    await waitFor(() => {
      expect(kakaoMocks.send).toHaveBeenCalledWith({ content, url: guestUrl });
    });
  });

  it("sends a guest to login only when community identity is required", async () => {
    const guestUrl = "https://nuang.app/share/g1.payload.signature";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, url: guestUrl }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      ),
    );
    shareAuthMocks.getUser.mockResolvedValueOnce({ data: { user: null } });

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "커뮤니티에 공유" }));

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith(
        "/login?next=%2F%3Fshare%3Dcommunity&reason=share",
      );
    });
    expect(
      screen.queryByPlaceholderText("이 결과를 보고 든 생각을 남겨보세요."),
    ).not.toBeInTheDocument();
  });

  it("publishes a signed guest summary as a safe community link after login", async () => {
    const guestUrl = "https://nuang.app/share/g1.payload.signature";
    const fetchMock = vi.fn(
      async (input: string | URL | Request, _init?: RequestInit) => {
        void _init;
        if (String(input) === "/api/guest-report-share-links") {
          return new Response(JSON.stringify({ ok: true, url: guestUrl }), {
            headers: { "content-type": "application/json" },
            status: 200,
          });
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
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "커뮤니티에 공유" }));
    expect(
      await screen.findByRole("dialog", { name: "커뮤니티에 공유" }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText("이 결과를 보고 든 생각을 남겨보세요."),
      { target: { value: "친구와 같이 이야기해 보고 싶어요." } },
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
      body: `친구와 같이 이야기해 보고 싶어요.\n\n${guestUrl}`,
      source: "free_text",
      visibility: "public",
    });
    expect(requestBody).not.toHaveProperty("attachments");
    expect(onNavigate).toHaveBeenCalledWith("/feed");
  });

  it("falls back to guest sharing when a local server id has no signed-in owner", async () => {
    const guestUrl = "https://nuang.app/share/g1.fallback.signature";
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/report-share-links") {
        return new Response(
          JSON.stringify({ error: "authentication_required" }),
          {
            headers: { "content-type": "application/json" },
            status: 401,
          },
        );
      }
      return new Response(JSON.stringify({ ok: true, url: guestUrl }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        originalReportKey="topic_11111111-1111-4111-8111-111111111111"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(guestUrl);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/guest-report-share-links",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps a local result shareable while account synchronization is still catching up", async () => {
    const guestUrl = "https://nuang.app/share/g1.sync-fallback.signature";
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/report-share-links") {
        return new Response(JSON.stringify({ error: "report_not_found" }), {
          headers: { "content-type": "application/json" },
          status: 404,
        });
      }
      return new Response(JSON.stringify({ ok: true, url: guestUrl }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        originalReportKey="topic_11111111-1111-4111-8111-111111111111"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(guestUrl);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/guest-report-share-links",
      expect.objectContaining({ method: "POST" }),
    );
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
      await screen.findByText("결과 링크를 복사했어요."),
    ).toBeInTheDocument();
  });

  it("uses the server-authorized link when both a report key and canonical URL exist", async () => {
    const authorizedUrl =
      "http://localhost:3000/feed/profiles/profile-1/reports/topic_authorized";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, url: authorizedUrl }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        canonicalUrl="/feed/profiles/profile-1/reports/topic_stale"
        content={content}
        isOpen
        onClose={vi.fn()}
        originalReportKey="topic_authorized"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/report-share-links",
        expect.objectContaining({ method: "POST" }),
      );
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(authorizedUrl);
    });
  });

  it("opens the official Kakao Talk picker with the prepared original report", async () => {
    const url =
      "http://localhost:3000/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111";

    render(
      <ReportShareSheet
        canonicalUrl={url}
        content={content}
        isOpen
        onClose={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", {
      name: "카카오톡으로 보내기",
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => {
      expect(kakaoMocks.send).toHaveBeenCalledWith({ content, url });
    });
    expect(
      screen.getByText("카카오톡에서 보낼 대상을 선택해 주세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("카카오톡에서 보낼 대화방을 직접 선택해요."),
    ).toBeInTheDocument();
  });

  it("falls back to the device share sheet when Kakao Talk cannot open", async () => {
    kakaoMocks.send.mockImplementationOnce(() => {
      throw new Error("picker unavailable");
    });
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: nativeShare,
    });
    const url =
      "http://localhost:3000/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111";

    render(
      <ReportShareSheet
        canonicalUrl={url}
        content={content}
        isOpen
        onClose={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", {
      name: "카카오톡으로 보내기",
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => {
      expect(nativeShare).toHaveBeenCalledWith(
        expect.objectContaining({ url }),
      );
    });
    expect(
      screen.getByText("카카오톡을 열지 못해 기기의 공유창을 열었어요."),
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

  it("resolves a core result to its persistent original report URL", async () => {
    const url =
      "http://localhost:3000/feed/profiles/profile-1/reports/core_11111111-1111-4111-8111-111111111111";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          persistent: true,
          url,
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
        "/api/report-share-links",
        expect.objectContaining({
          body: JSON.stringify({
            reportKey: "core_11111111-1111-4111-8111-111111111111",
          }),
          method: "POST",
        }),
      );
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    });
  });

  it("keeps a private report private when Kakao publication is cancelled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "report_private",
          message: "프로필에 공개한 결과만 링크로 공유할 수 있어요.",
          ok: false,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 409,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        originalReportKey="topic_11111111-1111-4111-8111-111111111111"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "카카오톡으로 보내기" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "공개 후 공유" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("이 결과를 공개하고 공유할까요?"),
    ).toBeInTheDocument();
    expect(screen.getByText("내 답변과 원점수")).toBeInTheDocument();
    expect(kakaoMocks.send).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(
      screen.getByRole("dialog", { name: "결과 공유" }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([input]) => String(input) === "/api/profile-report-visibility",
      ),
    ).toBe(false);
    expect(kakaoMocks.send).not.toHaveBeenCalled();
  });

  it.each([
    ["링크 복사", "공개하고 링크 복사"],
    ["다른 앱으로 공유", "공개하고 공유"],
    ["커뮤니티에 공유", "공개하고 커뮤니티에 공유"],
  ])(
    "asks before changing a private result for %s",
    async (actionName, approvalName) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "report_private",
            message: "프로필에 공개한 결과만 링크로 공유할 수 있어요.",
            ok: false,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 409,
          },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      render(
        <ReportShareSheet
          content={content}
          isOpen
          onClose={vi.fn()}
          originalReportKey="topic_private"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: actionName }));

      expect(
        await screen.findByRole("dialog", { name: "공개 후 공유" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: approvalName }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "공개 후 공유" }),
      ).toHaveFocus();
      expect(
        fetchMock.mock.calls.some(
          ([input]) => String(input) === "/api/profile-report-visibility",
        ),
      ).toBe(false);
    },
  );

  it("cannot be dismissed while a publication change is in progress", async () => {
    const reportKey = "topic_private";
    const publicUrl =
      "http://localhost:3000/feed/profiles/profile-1/reports/topic_private";
    let shareLinkAttempts = 0;
    let finishPublication: (() => void) | undefined;
    const publicationResponse = new Promise<Response>((resolve) => {
      finishPublication = () =>
        resolve(
          new Response(JSON.stringify({ visibility: "profile_public" }), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
        );
    });
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/profile-report-visibility") {
        return publicationResponse;
      }
      shareLinkAttempts += 1;
      if (shareLinkAttempts === 1) {
        return new Response(
          JSON.stringify({ error: "report_private", ok: false }),
          {
            headers: { "content-type": "application/json" },
            status: 409,
          },
        );
      }
      return new Response(JSON.stringify({ ok: true, url: publicUrl }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const onClose = vi.fn();

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={onClose}
        originalReportKey={reportKey}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "공개하고 링크 복사" }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "공개 설정 중" }),
      ).toBeDisabled();
    });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    screen
      .getAllByRole("button", { name: "공유 창 닫기" })
      .forEach((button) => expect(button).toBeDisabled());

    finishPublication?.();
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(publicUrl);
    });
  });

  it("publishes a private report before sharing it to Kakao on approval", async () => {
    const reportKey = "topic_11111111-1111-4111-8111-111111111111";
    const url =
      "http://localhost:3000/feed/profiles/profile-1/reports/topic_11111111-1111-4111-8111-111111111111";
    let shareLinkAttempts = 0;
    const fetchMock = vi.fn(
      async (input: string | URL | Request, _init?: RequestInit) => {
        void _init;
        const endpoint = String(input);
        if (endpoint === "/api/profile-report-visibility") {
          return new Response(
            JSON.stringify({
              ok: true,
              reportKey,
              visibility: "profile_public",
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          );
        }
        if (endpoint === "/api/report-share-links") {
          shareLinkAttempts += 1;
          if (shareLinkAttempts === 1) {
            return new Response(
              JSON.stringify({
                error: "report_private",
                message: "프로필에 공개한 결과만 링크로 공유할 수 있어요.",
                ok: false,
              }),
              {
                headers: { "content-type": "application/json" },
                status: 409,
              },
            );
          }
          return new Response(
            JSON.stringify({ ok: true, persistent: true, url }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          );
        }
        throw new Error(`Unexpected request: ${endpoint}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReportShareSheet
        content={content}
        isOpen
        onClose={vi.fn()}
        originalReportKey={reportKey}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "카카오톡으로 보내기" }),
    );
    await screen.findByRole("dialog", { name: "공개 후 공유" });
    fireEvent.click(
      screen.getByRole("button", { name: "공개하고 카카오톡 공유" }),
    );

    await waitFor(() => {
      expect(kakaoMocks.send).toHaveBeenCalledWith({ content, url });
    });
    const patchCallIndex = fetchMock.mock.calls.findIndex(
      ([input]) => String(input) === "/api/profile-report-visibility",
    );
    const lastLinkCallIndex = fetchMock.mock.calls.findLastIndex(
      ([input]) => String(input) === "/api/report-share-links",
    );
    expect(patchCallIndex).toBeGreaterThanOrEqual(0);
    expect(lastLinkCallIndex).toBeGreaterThan(patchCallIndex);
    expect(fetchMock.mock.calls[patchCallIndex]).toEqual([
      "/api/profile-report-visibility",
      expect.objectContaining({
        body: JSON.stringify({
          reportKey,
          visibility: "profile_public",
        }),
        method: "PATCH",
      }),
    ]);
    expect(shareLinkAttempts).toBe(2);
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
    expect(
      fetchMock.mock.calls.some(([input]) => String(input) === "/api/feed"),
    ).toBe(false);
    expect(
      await screen.findByRole("dialog", { name: "커뮤니티에 공유" }),
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("이 결과를 보고 든 생각을 남겨보세요."),
      { target: { value: "지금의 나와 정말 닮은 결과예요." } },
    );
    expect(
      screen.getByDisplayValue("지금의 나와 정말 닮은 결과예요."),
    ).toBeInTheDocument();

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

  it("prefills the selected result sentence in the community note", async () => {
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
      await screen.findByPlaceholderText(
        "이 결과를 보고 든 생각을 남겨보세요.",
      ),
    ).toHaveValue("“생각을 정리한 뒤 대화를 시작해요.”");
  });

  it.each([
    ["core", "코어 검사 공유 결과"],
    ["topic", "주제 검사 공유 결과"],
    ["lab", "별난 연구소 공유 결과"],
  ] as const)(
    "labels the %s result identity without relying on color",
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
