import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";

const { mockGetUser, mockSignOut } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSignOut: vi.fn(),
}));
const consentStorage = new Map<string, string>();

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
    consentStorage.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => consentStorage.get(key) ?? null,
        removeItem: (key: string) => consentStorage.delete(key),
        setItem: (key: string, value: string) => consentStorage.set(key, value),
      },
    });
    window.history.replaceState({}, "", "/login");
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it.each([
    [
      "origin_mismatch",
      "로그인을 시작한 주소로 돌아오지 못했어요. 현재 주소에서 다시 로그인해 주세요.",
    ],
    [
      "intent_expired",
      "로그인 시간이 지나 다시 확인이 필요해요. 다시 로그인해 주세요.",
    ],
    ["intent_missing", "로그인 확인 정보가 없어 다시 시작이 필요해요."],
    ["oauth_cancelled", "로그인을 취소했어요. 원할 때 다시 시도해 주세요."],
    ["session_error", "로그인 정보를 저장하지 못했어요. 다시 시도해 주세요."],
    [
      "account_deleted",
      "삭제된 계정의 로그인 정보예요. 다른 로그인 방법을 이용해 주세요.",
    ],
    [
      "identity_error",
      "로그인 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    ],
  ])(
    "explains %s and leaves the sign-in actions retryable",
    async (status, copy) => {
      window.history.replaceState({}, "", `/login?auth=${status}`);

      render(<AccountConnectPanel />);

      expect(await screen.findByText(copy)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "카카오로 계속하기" }),
      ).toBeDisabled();
      fireEvent.click(
        screen.getByRole("checkbox", { name: "필수 항목 모두 동의" }),
      );
      expect(
        screen.getByRole("button", { name: "카카오로 계속하기" }),
      ).toBeEnabled();
    },
  );

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
    expect(kakaoButton).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "만 14세 이상이에요",
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

  it("does not reuse optional consent saved by another login", async () => {
    window.localStorage.setItem(
      "nuang-consent-draft",
      JSON.stringify({
        analytics: true,
        is14OrOlder: true,
        marketing: true,
        privacy: true,
        terms: true,
      }),
    );

    render(<AccountConnectPanel />);

    fireEvent.click(
      await screen.findByText("선택 동의 보기", { selector: "summary" }),
    );
    expect(
      screen.getByRole("checkbox", {
        name: /서비스 개선을 위한 이용 데이터 수집/,
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /광고성 이메일 수신 동의/ }),
    ).not.toBeChecked();
    expect(window.localStorage.getItem("nuang-consent-draft")).not.toContain(
      "analytics",
    );
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
