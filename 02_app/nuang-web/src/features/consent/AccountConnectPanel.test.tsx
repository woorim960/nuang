import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";

const { mockGetUser, mockSignOut } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  }),
}));

vi.mock("@/features/auth/start-social-sign-in", () => ({
  startSocialSignIn: vi.fn(async () => ({
    message: "계정 서버 환경이 연결된 뒤 다시 시도해 주세요.",
    status: "missing_env",
  })),
}));

describe("AccountConnectPanel", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("links required consent copy to policy skeleton routes", async () => {
    render(<AccountConnectPanel />);

    expect(
      await screen.findByRole("link", { name: "이용약관" }),
    ).toHaveAttribute("href", "/policies/terms");
    expect(
      screen.getByRole("link", { name: "개인정보 처리방침" }),
    ).toHaveAttribute("href", "/policies/privacy");
  });

  it("opens social auth buttons only after required consent checks", async () => {
    render(<AccountConnectPanel />);

    const kakaoButton = await screen.findByRole("button", {
      name: "카카오로 계속하기",
    });

    expect(kakaoButton).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "이용약관에 동의해요" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "개인정보 처리방침에 동의해요",
      }),
    );

    expect(kakaoButton).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Google로 계속하기" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /네이버/ }),
    ).not.toBeInTheDocument();
  });

  it("falls back to the sign-in form when account check fails", async () => {
    mockGetUser.mockRejectedValue(new Error("auth unavailable"));

    render(<AccountConnectPanel />);

    expect(
      await screen.findByRole("button", { name: "카카오로 계속하기" }),
    ).toBeDisabled();
  });

  it("shows the connected account instead of repeating the sign-in form", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: "kakao" },
          identities: [],
          user_metadata: { nickname: "탐험가" },
        },
      },
    });

    render(<AccountConnectPanel />);

    expect(
      await screen.findByRole("heading", { name: "로그인 정보" }),
    ).toBeInTheDocument();
    expect(screen.getByText("탐험가")).toBeInTheDocument();
    expect(screen.getByText("카카오로 로그인 중")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "카카오로 계속하기" }),
    ).not.toBeInTheDocument();
  });
});
