import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "./constants";
import { PUBLIC_BALANCE_PACKS } from "./content";
import { BalanceGameSetup } from "./BalanceGameSetup";
import { BalanceApiClientError, createBalanceRoom } from "./client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/feed/CommunityScreenShell", () => ({
  CommunityScreenShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, createBalanceRoom: vi.fn() };
});

const pack = PUBLIC_BALANCE_PACKS.find((item) => item.slug === "what-to-eat")!;

describe("BalanceGameSetup", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(createBalanceRoom).mockReset();
    window.sessionStorage.clear();
  });

  it("creates a configured room from the dedicated setup screen", async () => {
    vi.mocked(createBalanceRoom).mockResolvedValue({
      ok: true,
      participantToken: "participant-token",
      room: { roomCode: "ABC234" },
    } as Awaited<ReturnType<typeof createBalanceRoom>>);

    render(<BalanceGameSetup pack={pack} />);
    fireEvent.change(screen.getByLabelText("방장 닉네임"), {
      target: { value: "민지" },
    });
    fireEvent.click(screen.getByRole("button", { name: "인원 한 명 늘리기" }));
    fireEvent.click(screen.getByRole("button", { name: "인원 한 명 늘리기" }));
    fireEvent.click(screen.getByRole("button", { name: "방 만들기" }));

    await waitFor(() =>
      expect(createBalanceRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
          hostNickname: "민지",
          packSlug: "what-to-eat",
          questionCount: 20,
          targetParticipantCount: 4,
        }),
      ),
    );
    expect(push).toHaveBeenCalledWith(
      "/assessments/together/balance-game/rooms/ABC234",
    );
  });

  it("offers length and participation choices in named groups", () => {
    render(<BalanceGameSetup pack={pack} />);

    const textboxes = screen.getAllByRole("textbox");
    const lengthGroup = screen.getByRole("group", { name: /문항 수/ });
    const modeGroup = screen.getByRole("group", { name: /참여 방식/ });
    expect(textboxes[0]).toBe(screen.getByLabelText("방 이름"));
    expect(textboxes[1]).toBe(screen.getByLabelText("방장 닉네임"));
    expect(within(lengthGroup).getAllByRole("button")).toHaveLength(3);
    expect(within(modeGroup).getAllByRole("button")).toHaveLength(2);
    expect(
      within(modeGroup).getByRole("button", { name: /초대한 사람끼리/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("changes the question-count accent tone with the selected length", () => {
    render(<BalanceGameSetup pack={pack} />);

    const lengthGroup = screen.getByRole("group", { name: /문항 수/ });
    const quick = within(lengthGroup).getByRole("button", { name: "가볍게" });
    const balanced = within(lengthGroup).getByText("20문항 · 약 3분");
    expect(quick.parentElement).toHaveAttribute("data-tone", "balanced");
    expect(balanced).toHaveAttribute("data-tone", "balanced");

    fireEvent.click(quick);
    expect(quick.parentElement).toHaveAttribute("data-tone", "quick");
    expect(within(lengthGroup).getByText("8문항 · 약 1분")).toHaveAttribute(
      "data-tone",
      "quick",
    );

    fireEvent.click(
      within(lengthGroup).getByRole("button", { name: "깊게" }),
    );
    expect(quick.parentElement).toHaveAttribute("data-tone", "deep");
    expect(within(lengthGroup).getByText("24문항 · 약 4분")).toHaveAttribute(
      "data-tone",
      "deep",
    );
  });

  it("preserves a feed-room draft across login recovery", async () => {
    vi.mocked(createBalanceRoom).mockRejectedValue(
      new BalanceApiClientError(
        {
          code: "feed_auth_required",
          message: "피드에서 모집하려면 먼저 로그인해 주세요.",
          ok: false,
          retryable: false,
        },
        401,
      ),
    );

    const { unmount } = render(<BalanceGameSetup pack={pack} />);
    fireEvent.change(screen.getByLabelText("방장 닉네임"), {
      target: { value: "민지" },
    });
    fireEvent.click(screen.getByRole("button", { name: /피드에서 함께 찾기/ }));
    fireEvent.click(screen.getByRole("button", { name: "방 만들기" }));

    expect(
      await screen.findByRole("link", {
        name: "로그인하고 이 설정으로 돌아오기",
      }),
    ).toHaveAttribute(
      "href",
      "/login?next=%2Fassessments%2Ftogether%2Fbalance-game%2Fsetup%3Fpack%3Dwhat-to-eat&reason=community",
    );

    unmount();
    render(<BalanceGameSetup pack={pack} />);
    await waitFor(() =>
      expect(screen.getByLabelText("방장 닉네임")).toHaveValue("민지"),
    );
  });
});
