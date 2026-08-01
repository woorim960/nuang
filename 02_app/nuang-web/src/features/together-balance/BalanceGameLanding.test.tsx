import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "./api-contract";
import { BalanceGameLanding } from "./BalanceGameLanding";
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
  return {
    ...actual,
    createBalanceRoom: vi.fn(),
  };
});

describe("BalanceGameLanding", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(createBalanceRoom).mockReset();
    window.sessionStorage.clear();
  });

  it("normalizes a six-character participation code and opens the room", () => {
    render(<BalanceGameLanding />);

    const input = screen.getByLabelText("참여 코드가 있나요?");
    fireEvent.change(input, { target: { value: "abC234" } });
    fireEvent.click(screen.getByRole("button", { name: /입장/ }));

    expect(input).toHaveValue("ABC234");
    expect(push).toHaveBeenCalledWith(
      "/assessments/together/balance-game/rooms/ABC234",
    );
  });

  it("opens a linked pack directly and creates a four-person room", async () => {
    vi.mocked(createBalanceRoom).mockResolvedValue({
      ok: true,
      participantToken: "participant-token",
      room: {
        roomCode: "ABC234",
      },
    } as Awaited<ReturnType<typeof createBalanceRoom>>);

    render(<BalanceGameLanding initialPackSlug="what-to-eat" />);

    expect(
      screen.getByRole("dialog", { name: "우리 뭐 먹을까? 방 만들기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "시작하면 결과가 열린 뒤 이 방 참여자끼리 닉네임과 문항별 선택을 볼 수 있어요.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/방장 닉네임/), {
      target: { value: "민지" },
    });
    fireEvent.click(screen.getByRole("button", { name: "인원 한 명 늘리기" }));
    fireEvent.click(screen.getByRole("button", { name: "인원 한 명 늘리기" }));
    fireEvent.click(screen.getByRole("button", { name: /우리끼리 방 만들기/ }));

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

  it("closes the room creation dialog with Escape and returns focus", () => {
    render(<BalanceGameLanding />);

    const packButton = screen.getByRole("button", {
      name: /우리 뭐 먹을까\?/,
    });
    packButton.focus();
    fireEvent.click(packButton);

    expect(
      screen.getByRole("dialog", { name: "우리 뭐 먹을까? 방 만들기" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(packButton).toHaveFocus();
  });

  it("offers compact length and participation choices in named groups", () => {
    render(<BalanceGameLanding initialPackSlug="what-to-eat" />);

    const lengthGroup = screen.getByRole("group", {
      name: "얼마나 해볼까요?",
    });
    const modeGroup = screen.getByRole("group", {
      name: "어떻게 함께할까요?",
    });

    expect(within(lengthGroup).getAllByRole("button")).toHaveLength(3);
    expect(within(modeGroup).getAllByRole("button")).toHaveLength(2);
    expect(
      within(modeGroup).getByRole("button", { name: /친구에게 초대/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("offers login recovery for a feed room and restores its draft", async () => {
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

    const { unmount } = render(
      <BalanceGameLanding initialPackSlug="what-to-eat" />,
    );
    fireEvent.change(screen.getByLabelText(/방장 닉네임/), {
      target: { value: "민지" },
    });
    fireEvent.click(screen.getByRole("button", { name: /피드에서 모집/ }));
    fireEvent.click(screen.getByRole("button", { name: "피드 모집방 만들기" }));

    const loginLink = await screen.findByRole("link", {
      name: "로그인하고 이어서 만들기",
    });
    expect(loginLink).toHaveAttribute(
      "href",
      "/login?next=%2Fassessments%2Ftogether%2Fbalance-game%3Fpack%3Dwhat-to-eat&reason=community",
    );

    unmount();
    render(<BalanceGameLanding initialPackSlug="what-to-eat" />);
    await waitFor(() =>
      expect(screen.getByLabelText(/방장 닉네임/)).toHaveValue("민지"),
    );
    expect(
      screen.getByRole("button", { name: /피드에서 모집/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
