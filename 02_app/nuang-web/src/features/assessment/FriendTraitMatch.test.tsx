import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FriendTraitMatch } from "@/features/assessment/FriendTraitMatch";
import {
  createFriendTraitMatchInviteUrl,
  parseFriendTraitMatchInvite,
} from "@/features/assessment/friend-trait-match-invite";

const now = new Date("2026-07-28T00:00:00.000Z").getTime();

describe("FriendTraitMatch invite contract", () => {
  it("creates and parses a versioned invite with a fixed lifetime", () => {
    const url = createFriendTraitMatchInviteUrl({
      guess: "listen",
      mine: "plan",
      now,
      origin: "https://nuang.example",
    });
    const searchParams = Object.fromEntries(new URL(url).searchParams);

    expect(parseFriendTraitMatchInvite(searchParams, now)).toMatchObject({
      guess: "listen",
      mine: "plan",
      status: "ready",
    });
  });

  it("rejects malformed, duplicated, and expired invite values", () => {
    const url = createFriendTraitMatchInviteUrl({
      guess: "listen",
      mine: "plan",
      now,
      origin: "https://nuang.example",
    });
    const searchParams = Object.fromEntries(new URL(url).searchParams);

    expect(
      parseFriendTraitMatchInvite({ ...searchParams, mine: "unknown" }, now),
    ).toEqual({ status: "invalid" });
    expect(
      parseFriendTraitMatchInvite(
        { ...searchParams, guess: ["listen", "plan"] },
        now,
      ),
    ).toEqual({ status: "invalid" });
    expect(
      parseFriendTraitMatchInvite(
        searchParams,
        Number(searchParams.expires) + 1,
      ),
    ).toEqual({ status: "expired" });
  });
});

describe("FriendTraitMatch sender", () => {
  it("moves from my answer to the friend prediction and copies a valid invite", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });

    render(<FriendTraitMatch />);

    fireEvent.click(
      screen.getByRole("radio", {
        name: /바뀐 일정에 맞춰 새 계획부터/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(
      screen.getByText("친구라면 어떤 답을 고를까요?"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("radio", {
        name: /왜 바뀌었는지 친구의 상황부터/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(
      screen.getByRole("button", { name: "친구에게 초대 보내기" }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const copiedUrl = String(writeText.mock.calls[0][0]);
    const parsed = parseFriendTraitMatchInvite(
      Object.fromEntries(new URL(copiedUrl).searchParams),
    );

    expect(parsed).toMatchObject({
      guess: "listen",
      mine: "plan",
      status: "ready",
    });
    expect(screen.getByText("초대 링크를 복사했어요.")).toBeInTheDocument();
  });
});

describe("FriendTraitMatch receiver", () => {
  it("collects the friend's actual choice and shows a matched prediction", () => {
    render(
      <FriendTraitMatch
        inviteState={{
          expiresAt: now + 1_000,
          guess: "listen",
          mine: "plan",
          status: "ready",
        }}
      />,
    );

    expect(
      screen.getByText("나는 실제로 어떤 답을 고를까요?"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("radio", {
        name: /왜 바뀌었는지 친구의 상황부터/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(
      screen.getByText("다른 선택까지 잘 알고 있었어요"),
    ).toBeInTheDocument();
    expect(screen.getByText("친구의 예상이 맞았어요")).toBeInTheDocument();
    expect(screen.getByText("친구의 선택")).toBeInTheDocument();
    expect(screen.getByText("친구가 예상한 내 선택")).toBeInTheDocument();
    expect(screen.getByText("내 실제 선택")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "나도 친구 성향 맞히기" }),
    ).toHaveAttribute("href", "/assessments/friend-match");
  });

  it("shows a clear restart path for an invalid or expired invite", () => {
    const { rerender } = render(
      <FriendTraitMatch inviteState={{ status: "invalid" }} />,
    );

    expect(
      screen.getByText("초대 링크를 확인할 수 없어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "새 게임 시작하기" }),
    ).toHaveAttribute("href", "/assessments/friend-match");

    rerender(<FriendTraitMatch inviteState={{ status: "expired" }} />);
    expect(
      screen.getByText("초대 링크의 사용 기간이 지났어요"),
    ).toBeInTheDocument();
  });
});
