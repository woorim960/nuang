import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

vi.mock("@/features/consent/AccountConnectPanel", () => ({
  AccountConnectPanel: ({
    context,
    continueHref,
  }: {
    context?: string;
    continueHref?: string;
  }) => (
    <div
      data-continue-href={continueHref}
      data-testid="account-connect-context"
    >
      {context}
    </div>
  ),
}));

describe("LoginPage", () => {
  it("explains result preservation and returns to the exact report", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({
          next: "/results/local/local_result_123",
          reason: "result_save",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "이번 결과를 내 기록으로 이어갈게요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/보고 있던 리포트로 돌아와 자동으로 저장해요/),
    ).toBeInTheDocument();
    expect(screen.getByText("결과로 돌아가기")).toHaveAttribute(
      "href",
      "/results/local/local_result_123",
    );
  });

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
        name: "내 선택을 저장하려면 로그인해 주세요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("account-connect-context")).toHaveTextContent(
      "community",
    );
    expect(screen.getByTestId("account-connect-context")).toHaveAttribute(
      "data-continue-href",
      "/home?resumeFeed=poll&pollId=poll-001&optionId=option-001",
    );
    expect(
      screen.getByRole("link", { name: "홈으로 돌아가기" }),
    ).toHaveAttribute("href", "/home");
  });

  it("keeps the regular account login copy for direct visits", async () => {
    render(await LoginPage({}));

    expect(
      screen.getByRole("heading", { name: "로그인하고 뉴앙을 이어가요" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("account-connect-context")).toHaveTextContent(
      "account",
    );
  });

  it("explains the safe web recovery path when a native callback opens in a browser", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ reason: "mobile_auth_fallback" }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "웹에서 뉴앙 로그인을 이어갈게요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/앱 연결이 끝나지 않아 웹에서 안전하게 다시 시작해요/),
    ).toBeInTheDocument();
  });

  it("returns account deletion requests to the authenticated deletion screen", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({
          next: "/my/settings/account/delete",
          reason: "account_delete",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "계정을 삭제하려면 먼저 로그인해 주세요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("account-connect-context")).toHaveAttribute(
      "data-continue-href",
      "/my/settings/account/delete",
    );
  });

  it("explains research access and keeps the exact return path", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({
          next: "/research?from=assessments",
          reason: "research",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "검사 질문 리뷰는 로그인 후 참여할 수 있어요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "이전 화면으로 돌아가기" }),
    ).toHaveAttribute("href", "/research?from=assessments");
  });

  it("treats report sharing as a community login and preserves its return path", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({
          next: "/share/g1.test?share=community",
          reason: "share",
        }),
      }),
    );

    expect(screen.getByTestId("account-connect-context")).toHaveTextContent(
      "community",
    );
    expect(screen.getByTestId("account-connect-context")).toHaveAttribute(
      "data-continue-href",
      "/share/g1.test?share=community",
    );
  });
});
