import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";

vi.mock("@/features/auth/start-social-sign-in", () => ({
  startSocialSignIn: vi.fn(async () => ({
    message: "계정 서버 환경이 연결된 뒤 다시 시도해 주세요.",
    status: "missing_env",
  })),
}));

describe("AccountConnectPanel", () => {
  it("links required consent copy to policy skeleton routes", () => {
    render(<AccountConnectPanel />);

    expect(
      screen.getByRole("link", { name: "이용약관 준비 문서" }),
    ).toHaveAttribute("href", "/policies/terms");
    expect(
      screen.getByRole("link", { name: "개인정보 준비 문서" }),
    ).toHaveAttribute("href", "/policies/privacy");
    expect(
      screen.getByText(/약관과 개인정보 문서는 아직 최종 검토 전입니다/),
    ).toBeInTheDocument();
  });

  it("opens social auth buttons only after required consent checks", () => {
    render(<AccountConnectPanel />);

    const kakaoButton = screen.getByRole("button", {
      name: "카카오로 계속하기",
    });

    expect(kakaoButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "만 14세 이상입니다" }));
    fireEvent.click(screen.getByRole("button", { name: "이용약관에 동의합니다" }));
    fireEvent.click(
      screen.getByRole("button", { name: "필수 개인정보 처리에 동의합니다" }),
    );

    expect(kakaoButton).toBeEnabled();
  });
});
