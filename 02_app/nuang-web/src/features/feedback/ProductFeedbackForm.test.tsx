import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductFeedbackForm } from "@/features/feedback/ProductFeedbackForm";

const storageValues = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storageValues.get(key) ?? null),
  removeItem: vi.fn((key: string) => storageValues.delete(key)),
  setItem: vi.fn((key: string, value: string) => {
    storageValues.set(key, value);
  }),
};

describe("ProductFeedbackForm", () => {
  beforeEach(() => {
    storageValues.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the form focused on three clear feedback types", () => {
    render(<ProductFeedbackForm initialSourcePath="/feed" />);

    expect(screen.getByRole("radio", { name: "오류" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "불편" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "아이디어" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "커뮤니티" })).toBePressed();
  });

  it("keeps a short draft and explains what needs fixing", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductFeedbackForm initialSourcePath="/my" />);

    await user.type(screen.getByLabelText("자세히 알려주세요"), "안돼요");
    await user.click(screen.getByRole("button", { name: "의견 보내기" }));

    expect(
      screen.getByText("의견을 조금만 더 자세히 적어 주세요."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits once and shows an in-place success state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          feedbackId: "feedback-1",
          ok: true,
          status: "received",
        }),
        { headers: { "content-type": "application/json" }, status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductFeedbackForm initialSourcePath="/feed" />);

    await user.click(screen.getByRole("radio", { name: "아이디어" }));
    await user.type(
      screen.getByLabelText("자세히 알려주세요"),
      "댓글에서도 사진을 함께 올릴 수 있으면 좋겠어요.",
    );
    await user.click(screen.getByRole("button", { name: "의견 보내기" }));

    await waitFor(() =>
      expect(screen.getByText("의견이 잘 전달됐어요")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "마이로 돌아가기" })).toHaveAttribute(
      "href",
      "/my",
    );
  });
});
