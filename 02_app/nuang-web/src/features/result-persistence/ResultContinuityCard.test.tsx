import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultContinuityCard } from "./ResultContinuityCard";

describe("ResultContinuityCard", () => {
  it("explains the real guest value and keeps the exact login return link", () => {
    render(
      <ResultContinuityCard
        kind="topic"
        loginHref="/login?reason=result_save&next=%2Fresult%2Ftopic_1"
        state="guest"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "로그인하고 이번 결과를 내 기록에 이어가세요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "로그인하고 결과 저장" }),
    ).toHaveAttribute(
      "href",
      "/login?reason=result_save&next=%2Fresult%2Ftopic_1",
    );
    expect(screen.getByText(/개별 답변과 원점수는 공개되지 않아요/)).toBeInTheDocument();
  });

  it("shows confirmed account storage without another sign-in prompt", () => {
    render(
      <ResultContinuityCard
        kind="lab"
        loginHref="/login"
        state="saved"
      />,
    );

    expect(screen.getByText("이 결과를 내 기록에 저장했어요")).toBeInTheDocument();
    expect(screen.getByText(/뉴앙코드에는 반영되지 않아요/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /로그인하고/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the bottom dock only after the reader has passed the inline card", () => {
    render(
      <ResultContinuityCard
        kind="core"
        loginHref="/login?reason=result_save"
        state="guest"
      />,
    );
    const inlineCard = screen.getByRole("region", {
      name: "로그인하고 이번 결과를 내 기록에 이어가세요",
    });

    expect(
      screen.queryByRole("complementary", { name: "결과 저장 안내" }),
    ).not.toBeInTheDocument();

    vi.spyOn(inlineCard, "getBoundingClientRect").mockReturnValue({
      bottom: 900,
    } as DOMRect);
    fireEvent.scroll(window);
    expect(
      screen.queryByRole("complementary", { name: "결과 저장 안내" }),
    ).not.toBeInTheDocument();

    vi.mocked(inlineCard.getBoundingClientRect).mockReturnValue({
      bottom: -1,
    } as DOMRect);
    fireEvent.scroll(window);
    expect(
      screen.getByRole("complementary", { name: "결과 저장 안내" }),
    ).toBeInTheDocument();
  });

  it("starts observing when account checking finishes and the card mounts", () => {
    const { rerender } = render(
      <ResultContinuityCard
        kind="core"
        loginHref="/login?reason=result_save"
        state="checking"
      />,
    );

    rerender(
      <ResultContinuityCard
        kind="core"
        loginHref="/login?reason=result_save"
        state="guest"
      />,
    );
    const inlineCard = screen.getByRole("region", {
      name: "로그인하고 이번 결과를 내 기록에 이어가세요",
    });
    vi.spyOn(inlineCard, "getBoundingClientRect").mockReturnValue({
      bottom: -1,
    } as DOMRect);

    fireEvent.scroll(window);

    expect(
      screen.getByRole("complementary", { name: "결과 저장 안내" }),
    ).toBeInTheDocument();
  });
});
