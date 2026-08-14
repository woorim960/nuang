import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequiredConsentPanel } from "@/features/consent/RequiredConsentPanel";
import { buildResultSaveLoginHref } from "@/features/result-persistence/result-continuity";

const { mockRefresh, mockReplace } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    replace: mockReplace,
  }),
}));

describe("RequiredConsentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps an authenticated visitor on the renewal form until explicit submit", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accountId: "account-1", ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const nextPath = "/results/local/local_result_1?backTo=%2Fmap";

    render(<RequiredConsentPanel nextPath={nextPath} />);

    expect(mockReplace).not.toHaveBeenCalled();
    const submit = screen.getByRole("button", {
      name: "동의하고 결과로 돌아가기",
    });
    expect(submit).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", { name: "필수 항목 모두 동의" }),
    );
    await user.click(submit);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(nextPath));
    expect(mockRefresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/required-consents",
      expect.objectContaining({
        body: JSON.stringify({
          is14OrOlder: true,
          privacy: true,
          terms: true,
        }),
        method: "POST",
      }),
    );
  });

  it("routes an expired session through login and back to the result", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "unauthenticated" }), {
          headers: { "content-type": "application/json" },
          status: 401,
        }),
      ),
    );
    const nextPath = "/results/local/local_result_2";

    render(<RequiredConsentPanel nextPath={nextPath} />);
    await user.click(
      screen.getByRole("checkbox", { name: "필수 항목 모두 동의" }),
    );
    await user.click(
      screen.getByRole("button", { name: "동의하고 결과로 돌아가기" }),
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        buildResultSaveLoginHref(nextPath),
      );
    });
  });
});
