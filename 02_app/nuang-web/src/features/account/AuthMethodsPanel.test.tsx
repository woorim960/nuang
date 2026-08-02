import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthMethodsPanel } from "@/features/account/AuthMethodsPanel";

const mocks = vi.hoisted(() => ({
  linkIdentity: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      linkIdentity: mocks.linkIdentity,
      signOut: mocks.signOut,
    },
  }),
}));

vi.mock("@/features/assessment/assessment-account-sync", () => ({
  clearAccountOwnedLocalAttempts: vi.fn(),
}));

const security = {
  currentProvider: "google",
  features: {
    linking: true,
    phoneVerification: false,
    unlinking: true,
  },
  linkedCount: 1,
  methods: [
    {
      canUnlink: false,
      current: true,
      emailMasked: "wo***@gmail.com",
      label: "Google",
      provider: "google",
      status: "connected",
    },
    {
      canUnlink: false,
      current: false,
      emailMasked: null,
      label: "카카오",
      provider: "kakao",
      status: "available",
    },
  ],
};

beforeEach(() => {
  mocks.linkIdentity.mockReset().mockResolvedValue({ data: {}, error: null });
  mocks.signOut.mockReset().mockResolvedValue({ error: null });
  mocks.replace.mockReset();
  mocks.refresh.mockReset();
  window.history.replaceState({}, "", "/my/settings/account");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthMethodsPanel", () => {
  it("shows every provider and starts a manual OAuth link without a new Nuang account", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(
        String(input) === "/api/me/auth/methods"
          ? Response.json({ ok: true, security })
          : Response.json({
          link: {
            expiresAt: "2026-08-02T01:10:00.000Z",
            provider: "kakao",
            redirectTo: "https://nuang.app/auth/link/callback",
          },
          ok: true,
            }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthMethodsPanel />);

    expect(await screen.findByText("wo***@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("현재 로그인")).toBeInTheDocument();
    const connect = screen.getByRole("button", { name: "연결" });
    expect(connect).toHaveAccessibleName("연결");

    fireEvent.click(connect);

    await waitFor(() => expect(mocks.linkIdentity).toHaveBeenCalledTimes(1));
    const linkCall = fetchMock.mock.calls.find(
      ([input]) => String(input) === "/api/me/auth/link-intents",
    );
    expect(JSON.parse(String(linkCall?.[1]?.body))).toEqual({
      provider: "kakao",
      returnPath: "/my/settings/account",
    });
    expect(mocks.linkIdentity).toHaveBeenCalledWith({
      options: { redirectTo: "https://nuang.app/auth/link/callback" },
      provider: "kakao",
    });
  });

  it("explains that the existing record is unchanged when linking fails", async () => {
    window.history.replaceState(
      {},
      "",
      "/my/settings/account?link=conflict",
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(Response.json({ ok: true, security })),
        ),
    );

    render(<AuthMethodsPanel />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "기존 기록은 그대로예요",
    );
    expect(window.location.search).toBe("");
  });

  it("keeps unlink confirmation keyboard safe", async () => {
    const unlinkableSecurity = {
      ...security,
      linkedCount: 2,
      methods: security.methods.map((method) =>
        method.provider === "kakao"
          ? {
              ...method,
              canUnlink: true,
              emailMasked: "ka***@kakao.com",
              status: "connected" as const,
            }
          : method,
      ),
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            Response.json({ ok: true, security: unlinkableSecurity }),
          ),
        ),
    );

    render(<AuthMethodsPanel />);

    const trigger = await screen.findByRole("button", {
      name: "카카오 로그인 연결 해제",
    });
    trigger.focus();
    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "카카오 연결을 해제할까요?" }),
    ).toBeInTheDocument();
    const safeButton = screen.getByRole("button", { name: "유지하기" });
    await waitFor(() => expect(safeButton).toHaveFocus());
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
