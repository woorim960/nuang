import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FeedPage, { metadata } from "@/app/feed/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/feed",
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("FeedPage", () => {
  it("renders the separate feed surface without bottom-nav or together copy", async () => {
    render(await FeedPage());

    expect(screen.getByRole("heading", { name: "피드" })).toBeInTheDocument();
    expect(screen.getByText("오늘 내 리듬은 어떤 쪽인가요?")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("오늘의 생각을 공유해보세요."),
    ).toBeInTheDocument();
    expect(screen.getByText("다른 리듬과 맞춰가는 방법")).toBeInTheDocument();
    expect(screen.getByText("내 성향을 한 장으로 소개한다면")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로 돌아가기" })).toHaveAttribute(
      "href",
      "/home",
    );
    expect(document.body).not.toHaveTextContent("커뮤니티");
    expect(document.body).not.toHaveTextContent("함께 탭");
  });

  it("keeps product metadata for the feed route", () => {
    expect(metadata.title).toBe("피드 | NUANG");
  });

  it("opens a public profile popup from a feed profile without public code input", async () => {
    const user = userEvent.setup();

    render(await FeedPage());

    await user.click(screen.getAllByRole("button", { name: "성향 카드 프로필 보기" })[0]);

    expect(screen.getByRole("dialog", { name: "성향 카드" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: "성향 카드 프로필 이미지" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("TVOAE")).toBeInTheDocument();
    expect(screen.getByText("불꽃의 온기 탐험가")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "나와 비교하기" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("공개 코드");
  });
});
