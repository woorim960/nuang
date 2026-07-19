import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeedPage, { metadata } from "@/app/feed/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/feed",
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("FeedPage", () => {
  it("renders a focused community feed without unfinished controls or example posts", async () => {
    render(await FeedPage());

    expect(screen.getByRole("heading", { name: "피드" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "검사 답변과 점수는 공개하지 않고, 직접 나눈 이야기만 보여줘요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("오늘의 생각을 공유해보세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "내 이야기 남기기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "새로운 이야기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("아직 공개된 이야기가 없어요")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "피드 검색" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "메시지" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "팔로잉" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("TVOAE")).not.toBeInTheDocument();
  });

  it("keeps product metadata for the feed route", () => {
    expect(metadata.title).toBe("피드 | NUANG");
  });

  it("keeps the bottom navigation as the only way back to main tabs", async () => {
    render(await FeedPage());

    expect(screen.getByRole("link", { name: "홈 탭" })).toHaveAttribute(
      "href",
      "/home",
    );
    expect(
      screen.queryByRole("link", { name: "홈으로 돌아가기" }),
    ).not.toBeInTheDocument();
  });
});
