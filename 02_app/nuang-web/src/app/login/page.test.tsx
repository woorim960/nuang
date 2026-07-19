import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

vi.mock("@/features/consent/AccountConnectPanel", () => ({
  AccountConnectPanel: ({ context }: { context?: string }) => (
    <div data-testid="account-connect-context">{context}</div>
  ),
}));

describe("LoginPage", () => {
  it("explains why login is needed without losing a pending poll", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({
          next: "/home?resumeFeed=poll&pollId=poll-001&optionId=option-001",
          reason: "poll",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "선택을 저장하고 결과를 확인해요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("account-connect-context")).toHaveTextContent(
      "community",
    );
    expect(
      screen.getByRole("link", { name: "홈으로 돌아가기" }),
    ).toHaveAttribute("href", "/home");
  });

  it("keeps the regular account login copy for direct visits", async () => {
    render(await LoginPage({}));

    expect(
      screen.getByRole("heading", { name: "뉴앙에 로그인" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("account-connect-context")).toHaveTextContent(
      "account",
    );
  });
});
