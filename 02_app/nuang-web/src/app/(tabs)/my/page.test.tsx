import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyPage from "@/app/(tabs)/my/page";

vi.mock("@/features/account/MyOverview", () => ({
  MyOverview: () => (
    <section aria-label="my-overview">
      <h1>마이</h1>
      <a href="/my/reports">내 리포트</a>
      <a href="/my/settings">설정</a>
    </section>
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn().mockReturnValue(null),
}));

describe("MyPage", () => {
  it("keeps the helpful fallback when a signed-in profile is unavailable", async () => {
    render(await MyPage());

    expect(screen.getByLabelText("my-overview")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 리포트" })).toHaveAttribute(
      "href",
      "/my/reports",
    );
    expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute(
      "href",
      "/my/settings",
    );
    expect(document.body).not.toHaveTextContent("공유 링크 관리");
    expect(document.body).not.toHaveTextContent("공개 코드");
  });
});
