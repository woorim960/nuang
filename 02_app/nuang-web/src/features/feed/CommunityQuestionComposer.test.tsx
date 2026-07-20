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
      screen.getByRole("button", { name: "한 자리 성향" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "5자리 코드" }));
    fireEvent.change(
      screen.getByLabelText("답변을 받고 싶은 5자리 뉴앙 코드"),
      { target: { value: "ENAKQ" } },
    );
    fireEvent.change(screen.getByLabelText("질문"), {
      target: { value: "친구가 고민을 말할 때 어떤 반응이 가장 편한가요?" },
    });

    expect(screen.getByText(/관계를 여는 지휘자에게/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "질문 업로드" }));

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
      topic: { category: "concerns_questions" },
    });
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/feed?posted=question-post-001",
    );
  });
});
