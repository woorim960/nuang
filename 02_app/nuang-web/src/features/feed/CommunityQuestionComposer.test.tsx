import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunityQuestionComposer } from "@/features/feed/CommunityQuestionComposer";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

describe("CommunityQuestionComposer", () => {
  afterEach(() => {
    navigationMocks.push.mockClear();
    navigationMocks.refresh.mockClear();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("keeps one-letter and exact-code audiences and uploads a feed question", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          feedWrite: { id: "question-post-001" },
          ok: true,
        }),
      ),
    );

    render(<CommunityQuestionComposer />);

    expect(
      screen.getByRole("radio", { name: /직접 선택/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /직접 선택/ }));
    fireEvent.click(
      screen.getByRole("tab", { name: "5글자 뉴앙 코드" }),
    );
    fireEvent.change(
      screen.getByLabelText("답변을 받고 싶은 5글자 뉴앙 코드"),
      { target: { value: "ENAKQ" } },
    );
    fireEvent.change(screen.getByLabelText("질문 내용"), {
      target: { value: "친구가 고민을 말할 때 어떤 반응이 가장 편한가요?" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "관계 주제" }));
    const tagInput = screen.getByLabelText("태그 추가");
    fireEvent.change(tagInput, { target: { value: "관계" } });
    fireEvent.keyDown(tagInput, { key: " " });

    expect(screen.getByText("ENAKQ · 관계를 여는 선도자")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "질문 등록" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/feed",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const request = JSON.parse(
      String((vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body),
    );
    expect(request).toMatchObject({
      action: "create_post",
      sourceId: "ask_exact_enakq",
      topic: { category: "relationships", tags: ["관계"] },
    });
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/feed?posted=question-post-001",
    );
  });

  it("uses the same form for editing and locks the audience after replies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          feedWrite: {
            action: "update_post",
            id: "22222222-2222-4222-8222-222222222222",
          },
          ok: true,
        }),
      ),
    );

    render(
      <CommunityQuestionComposer
        initialValue={{
          audience: { codes: ["ENAKQ"], mode: "exact" },
          body: "연락이 늦을 때 어떤 생각이 먼저 드나요?",
          postId: "22222222-2222-4222-8222-222222222222",
          replyCount: 2,
        }}
        returnTo="/my"
      />,
    );

    expect(
      screen.getByText("답변이 시작되어 질문 대상은 바꿀 수 없어요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /모든 성향/ }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText("답변을 받고 싶은 5글자 뉴앙 코드"),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText("질문 내용"), {
      target: { value: "연락이 늦을 때 보통 어떤 생각이 먼저 드나요?" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "변경 내용 저장" }),
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const request = JSON.parse(
      String((vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body),
    );
    expect(request).toMatchObject({
      action: "update_post",
      postId: "22222222-2222-4222-8222-222222222222",
      sourceId: "ask_exact_enakq",
    });
    expect(navigationMocks.push).toHaveBeenCalledWith("/my");
  });
});
