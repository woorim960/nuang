import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunityBalanceGameComposer } from "@/features/feed/CommunityBalanceGameComposer";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

describe("CommunityBalanceGameComposer", () => {
  afterEach(() => {
    navigationMocks.push.mockClear();
    navigationMocks.refresh.mockClear();
    vi.unstubAllGlobals();
  });

  it("creates a two-choice balance game without casting an author vote", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, request?: RequestInit) => {
        void input;
        void request;
        return new Response(
          JSON.stringify({
            feedWrite: {
              id: "22222222-2222-4222-8222-222222222222",
              moderationStatus: "published",
            },
          }),
          { status: 200 },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CommunityBalanceGameComposer />);

    fireEvent.change(screen.getByLabelText("투표 질문"), {
      target: { value: "주말에 더 끌리는 약속은 무엇인가요?" },
    });
    fireEvent.change(screen.getByLabelText("첫 번째 선택지"), {
      target: { value: "여럿이 함께 보내기" },
    });
    fireEvent.change(screen.getByLabelText("두 번째 선택지"), {
      target: { value: "가까운 한 사람과 보내기" },
    });
    fireEvent.change(screen.getByLabelText("투표 설명"), {
      target: { value: "친구들의 선택이 궁금해요." },
    });
    fireEvent.click(screen.getByRole("radio", { name: "취향 주제" }));
    const tagInput = screen.getByLabelText("태그 추가");
    fireEvent.change(tagInput, { target: { value: "주말" } });
    fireEvent.keyDown(tagInput, { key: " " });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(request?.body))).toEqual({
      action: "create_post",
      body: "친구들의 선택이 궁금해요.",
      poll: {
        options: ["여럿이 함께 보내기", "가까운 한 사람과 보내기"],
        question: "주말에 더 끌리는 약속은 무엇인가요?",
      },
      source: "balance_game",
      sourceId: "user_balance_game_v1",
      topic: {
        category: "preferences",
        source: "manual",
        tags: ["주말"],
      },
      visibility: "public",
    });
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/feed?posted=22222222-2222-4222-8222-222222222222",
    );
  });

  it("locks question and choices after the first vote while keeping the note editable", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, request?: RequestInit) => {
        void input;
        void request;
        return new Response(
          JSON.stringify({
            feedWrite: {
              id: "22222222-2222-4222-8222-222222222222",
              moderationStatus: "published",
            },
          }),
          { status: 200 },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommunityBalanceGameComposer
        initialValue={{
          body: "처음 설명",
          options: ["친구와 함께", "혼자서 여유롭게"],
          pollStatus: "active",
          postId: "22222222-2222-4222-8222-222222222222",
          question: "갑자기 하루가 비었다면?",
          totalVotes: 3,
        }}
      />,
    );

    expect(
      screen.queryByLabelText("투표 질문"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("첫 번째 선택지")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /3명이 참여했어요/ }),
    ).toBeVisible();
    expect(screen.getByText("갑자기 하루가 비었다면?")).toBeVisible();

    fireEvent.change(screen.getByLabelText("투표 설명"), {
      target: { value: "수정한 설명" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(request?.body))).toEqual({
      action: "update_post",
      body: "수정한 설명",
      postId: "22222222-2222-4222-8222-222222222222",
      topic: {
        category: null,
        source: "manual",
        tags: [],
      },
      visibility: "public",
    });
  });

  it("deletes an authored balance game only after confirmation", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, request?: RequestInit) => {
        void input;
        void request;
        return new Response(
          JSON.stringify({
            feedWrite: {
              id: "22222222-2222-4222-8222-222222222222",
            },
          }),
          { status: 200 },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommunityBalanceGameComposer
        initialValue={{
          body: "",
          options: ["A", "B"],
          pollStatus: "closed",
          postId: "22222222-2222-4222-8222-222222222222",
          question: "둘 중 더 끌리는 선택은 무엇인가요?",
          totalVotes: 12,
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "투표 삭제" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(request?.body))).toEqual({
      action: "delete_post",
      postId: "22222222-2222-4222-8222-222222222222",
    });
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/feed?deleted=balance",
    );
  });

  it("keeps unfinished content on screen until the viewer confirms leaving", () => {
    render(<CommunityBalanceGameComposer />);

    fireEvent.change(screen.getByLabelText("투표 질문"), {
      target: { value: "작성 중인 질문" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "이전 화면으로 돌아가기" }),
    );

    expect(
      screen.getByRole("dialog", { name: "작성 중인 내용을 나갈까요?" }),
    ).toBeVisible();
    expect(navigationMocks.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "계속 작성" }));
    expect(
      screen.queryByRole("dialog", { name: "작성 중인 내용을 나갈까요?" }),
    ).not.toBeInTheDocument();
  });

  it("explains missing fields after the viewer taps upload", () => {
    render(<CommunityBalanceGameComposer />);

    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    expect(screen.getByText("질문을 적어 주세요.")).toBeVisible();
    expect(screen.getByText("두 선택지를 모두 적어 주세요.")).toBeVisible();
  });
});
