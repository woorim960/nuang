import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "./api-contract";
import type { BalanceRoomState } from "./api-contract";
import { BalanceGameRoom, QuestionRunner } from "./BalanceGameRoom";
import { getResultGuestCharacterMotif } from "./BalanceResultArtwork";
import {
  BalanceApiClientError,
  clearParticipantSession,
  completeBalanceRoom,
  joinBalanceRoom,
  readBalanceRoom,
  readBalanceRoomPreview,
  readParticipantSession,
  removeBalanceParticipant,
  saveBalanceResponse,
} from "./client";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return {
    ...actual,
    clearParticipantSession: vi.fn(),
    completeBalanceRoom: vi.fn(),
    finalizeBalanceRoom: vi.fn(),
    joinBalanceRoom: vi.fn(),
    readBalanceRoom: vi.fn(),
    readBalanceRoomPreview: vi.fn(),
    readParticipantSession: vi.fn(),
    removeBalanceParticipant: vi.fn(),
    saveBalanceResponse: vi.fn(),
    shareBalanceRoomToFeed: vi.fn(),
  };
});

const answeredRoom: BalanceRoomState = {
  canFinalize: false,
  canShareToFeed: false,
  currentParticipantCount: 1,
  expiresAt: "2026-08-07T00:00:00.000Z",
  isOwner: true,
  myParticipantId: "participant-me",
  pack: {
    description: "한국 메뉴 취향을 골라봐요.",
    resultLabel: "취향 싱크",
    scoringTemplate: "taste_sync",
    slug: "what-to-eat",
    title: "우리 뭐 먹을까?",
  },
  participants: [
    {
      answeredCount: 2,
      completedAt: null,
      id: "participant-me",
      isMe: true,
      isOwner: true,
      nickname: "민지",
      status: "active",
    },
  ],
  participationMode: "private_group",
  questionCount: 2,
  questions: [
    {
      id: "food_001",
      options: [
        { id: "food_001_a", position: "left", text: "후라이드 치킨" },
        { id: "food_001_b", position: "right", text: "양념 치킨" },
      ],
      prompt: "치킨 한 마리를 고른다면?",
      responseOptionId: "food_001_a",
      roundNumber: 1,
      subtopic: "치킨",
    },
    {
      id: "food_002",
      options: [
        { id: "food_002_a", position: "left", text: "짜장면" },
        { id: "food_002_b", position: "right", text: "짬뽕" },
      ],
      prompt: "중식 메뉴 하나를 고른다면?",
      responseOptionId: "food_002_b",
      roundNumber: 1,
      subtopic: "중식",
    },
  ],
  result: null,
  resultStatus: "waiting",
  roomCode: "ABC234",
  roomId: "room-id",
  roomName: "민지의 취향 대결",
  targetParticipantCount: 2,
};

const roomPreview = {
  currentParticipantCount: 1,
  expiresAt: "2026-08-07T00:00:00.000Z",
  hostNickname: "민지",
  joinStatus: "open" as const,
  pack: {
    description: "한국 메뉴 취향을 골라봐요.",
    slug: "what-to-eat",
    title: "우리 뭐 먹을까?",
  },
  participationMode: "private_group" as const,
  questionCount: 8,
  roomCode: "ABC234",
  roomName: "민지의 취향 대결",
  targetParticipantCount: 2,
};

function createQuestionRoom(
  responseOptionIds: [string | null, string | null],
): BalanceRoomState {
  const answeredCount = responseOptionIds.filter(Boolean).length;
  return {
    ...answeredRoom,
    isOwner: false,
    participants: [
      {
        ...answeredRoom.participants[0],
        answeredCount,
        isOwner: false,
      },
    ],
    questions: answeredRoom.questions.map((question, index) => ({
      ...question,
      responseOptionId: responseOptionIds[index] ?? null,
    })) as BalanceRoomState["questions"],
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createSavedResponse(questionId: string, optionId: string) {
  return {
    ok: true as const,
    saved: {
      clientSequence: 1,
      optionId,
      questionId,
    },
  };
}

describe("BalanceGameRoom", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    replace.mockReset();
    vi.mocked(readBalanceRoom).mockReset();
    window.sessionStorage.clear();
    vi.mocked(readParticipantSession).mockReturnValue({
      participantId: "participant-me",
      participantToken: "participant-token",
      savedAt: "2026-07-31T00:00:00.000Z",
    });
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: answeredRoom,
    });
    vi.mocked(completeBalanceRoom).mockResolvedValue({
      completed: {
        participantId: "participant-me",
      },
      ok: true,
      room: {
        ...answeredRoom,
        participants: answeredRoom.participants.map((participant) => ({
          ...participant,
          completedAt: "2026-07-31T00:00:02.000Z",
          status: "completed" as const,
        })),
      },
    });
  });

  it("assigns the five guest characters in participation order and cycles safely", () => {
    expect(
      Array.from({ length: 6 }, (_, index) =>
        getResultGuestCharacterMotif(index),
      ),
    ).toEqual(["purple", "flame", "sun", "water", "forest", "purple"]);
  });

  it("keeps an assessment-studio preview choice in memory without saving a response", () => {
    vi.useFakeTimers();
    const onRoomChange = vi.fn();

    render(
      <QuestionRunner
        onRoomChange={onRoomChange}
        previewMode
        room={createQuestionRoom([null, null])}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "후라이드 치킨" }));

    expect(saveBalanceResponse).not.toHaveBeenCalled();
    expect(onRoomChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "후라이드 치킨" }),
    ).toHaveAttribute("aria-pressed", "true");

    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(
      screen.getByRole("heading", { name: "중식 메뉴 하나를 고른다면?" }),
    ).toBeInTheDocument();
    expect(saveBalanceResponse).not.toHaveBeenCalled();
  });

  it("accepts only the first choice when both sides are tapped rapidly", async () => {
    const room = createQuestionRoom([null, null]);
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room,
    });
    vi.mocked(saveBalanceResponse).mockResolvedValue(
      createSavedResponse("food_001", "food_001_a"),
    );

    render(<BalanceGameRoom roomCode="ABC234" />);

    const left = await screen.findByRole("button", {
      name: "후라이드 치킨",
    });
    const right = screen.getByRole("button", { name: "양념 치킨" });
    fireEvent.click(left);
    fireEvent.click(right);

    await waitFor(() => expect(saveBalanceResponse).toHaveBeenCalledTimes(1));
    expect(saveBalanceResponse).toHaveBeenCalledWith("ABC234", "food_001", {
      optionId: "food_001_a",
    });
  });

  it("selects a choice with the keyboard and advances without a next button", async () => {
    const user = userEvent.setup();
    const room = createQuestionRoom([null, null]);
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room,
    });
    vi.mocked(saveBalanceResponse).mockResolvedValue(
      createSavedResponse("food_001", "food_001_a"),
    );

    render(<BalanceGameRoom roomCode="ABC234" />);

    const left = await screen.findByRole("button", {
      name: "후라이드 치킨",
    });
    left.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(saveBalanceResponse).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole("heading", {
        name: "중식 메뉴 하나를 고른다면?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /다음/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the next question within 250ms while the previous save is still pending", async () => {
    const room = createQuestionRoom([null, null]);
    const deferred =
      createDeferred<Awaited<ReturnType<typeof saveBalanceResponse>>>();
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room,
    });
    vi.mocked(saveBalanceResponse).mockReturnValue(deferred.promise);

    render(<BalanceGameRoom roomCode="ABC234" />);

    const left = await screen.findByRole("button", {
      name: "후라이드 치킨",
    });
    vi.useFakeTimers();
    fireEvent.click(left);
    await act(async () => {
      await Promise.resolve();
    });
    expect(saveBalanceResponse).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(
      screen.getByRole("heading", {
        name: "중식 메뉴 하나를 고른다면?",
      }),
    ).toBeInTheDocument();

    vi.useRealTimers();
    await act(async () => {
      deferred.resolve(createSavedResponse("food_001", "food_001_a"));
      await deferred.promise;
    });
  });

  it("does not complete after the last save fails and retries that choice", async () => {
    const room = createQuestionRoom(["food_001_a", null]);
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room,
    });
    vi.mocked(saveBalanceResponse)
      .mockRejectedValueOnce(new Error("저장 실패"))
      .mockResolvedValueOnce(createSavedResponse("food_002", "food_002_a"));

    render(<BalanceGameRoom roomCode="ABC234" />);

    fireEvent.click(await screen.findByRole("button", { name: "짜장면" }));

    const retry = await screen.findByRole("button", { name: "다시 저장" });
    expect(completeBalanceRoom).not.toHaveBeenCalled();
    expect(saveBalanceResponse).toHaveBeenCalledTimes(1);

    fireEvent.click(retry);

    await waitFor(() => expect(saveBalanceResponse).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(completeBalanceRoom).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/assessments/together/balance-game/rooms/ABC234/result",
      ),
    );
  });

  it("recovers with the same completion request after result preparation fails", async () => {
    vi.mocked(completeBalanceRoom).mockRejectedValueOnce(
      new Error("결과 준비 실패"),
    );

    render(<BalanceGameRoom roomCode="ABC234" />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "결과 보기",
      }),
    );
    const retry = await screen.findByRole("button", {
      name: "결과 다시 준비",
    });
    expect(completeBalanceRoom).toHaveBeenCalledTimes(1);

    fireEvent.click(retry);

    await waitFor(() => expect(completeBalanceRoom).toHaveBeenCalledTimes(2));
    expect(vi.mocked(completeBalanceRoom).mock.calls[1]?.[1]).toBe(
      vi.mocked(completeBalanceRoom).mock.calls[0]?.[1],
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/assessments/together/balance-game/rooms/ABC234/result",
      ),
    );
  });

  it("does not poll the full room state while a participant is answering", async () => {
    const room = createQuestionRoom([null, null]);
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room,
    });

    render(<BalanceGameRoom roomCode="ABC234" />);

    expect(
      await screen.findByRole("heading", {
        name: "치킨 한 마리를 고른다면?",
      }),
    ).toBeInTheDocument();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(readBalanceRoom).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "후라이드 치킨" }),
    ).toBeInTheDocument();
  });

  it("stops polling after the result becomes final", async () => {
    vi.useFakeTimers();
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: {
        ...answeredRoom,
        participants: answeredRoom.participants.map((participant) => ({
          ...participant,
          completedAt: "2026-07-31T00:00:02.000Z",
          status: "completed" as const,
        })),
        resultStatus: "final",
      },
    });

    render(<BalanceGameRoom resultView roomCode="ABC234" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(readBalanceRoom).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(10_000));
    expect(readBalanceRoom).toHaveBeenCalledTimes(1);
  });

  it("recovers an all-answered reload with an explicit completion retry", async () => {
    render(<BalanceGameRoom roomCode="abc234" />);

    const completeButton = await screen.findByRole("button", {
      name: "결과 보기",
    });
    fireEvent.click(completeButton);

    await waitFor(() =>
      expect(completeBalanceRoom).toHaveBeenCalledWith(
        "ABC234",
        expect.any(String),
      ),
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/assessments/together/balance-game/rooms/ABC234/result",
      ),
    );
  });

  it("clears an invalid participant token and falls back to the join preview", async () => {
    vi.mocked(readBalanceRoom).mockRejectedValue(
      new BalanceApiClientError(
        {
          code: "participant_unauthorized",
          message: "참여 정보를 다시 확인해 주세요.",
          ok: false,
          retryable: false,
        },
        401,
      ),
    );
    vi.mocked(readBalanceRoomPreview).mockResolvedValue({
      ok: true,
      room: roomPreview,
    });

    render(<BalanceGameRoom roomCode="abc234" />);

    expect(await screen.findByText("민지 님이 초대했어요")).toBeInTheDocument();
    expect(clearParticipantSession).toHaveBeenCalledWith("ABC234");
  });

  it("lets the host invite people before starting their own answers", async () => {
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: {
        ...answeredRoom,
        participants: [
          {
            ...answeredRoom.participants[0],
            answeredCount: 0,
          },
        ],
        questions: answeredRoom.questions.map((question) => ({
          ...question,
          responseOptionId: null,
        })),
      },
    });

    render(<BalanceGameRoom roomCode="ABC234" />);

    expect(
      await screen.findByText("먼저 초대하고, 나는 바로 골라볼까요?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "초대 링크 보내기" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /내 선택 시작하기/ }));
    expect(
      screen.getByRole("heading", { name: "치킨 한 마리를 고른다면?" }),
    ).toBeInTheDocument();
  });

  it("continues into the next round without interrupting the game", async () => {
    const questions = Array.from({ length: 9 }, (_, index) => ({
      id: `food_${index + 1}`,
      options: [
        {
          id: `food_${index + 1}_a`,
          position: "left" as const,
          text: `선택 A ${index + 1}`,
        },
        {
          id: `food_${index + 1}_b`,
          position: "right" as const,
          text: `선택 B ${index + 1}`,
        },
      ] as BalanceRoomState["questions"][number]["options"],
      prompt: `${index + 1}번째 질문`,
      responseOptionId: index < 7 ? `food_${index + 1}_a` : null,
      roundNumber: index < 8 ? 1 : 2,
      subtopic: "메뉴",
    }));
    const checkpointRoom: BalanceRoomState = {
      ...answeredRoom,
      participants: [
        {
          ...answeredRoom.participants[0],
          answeredCount: 7,
        },
      ],
      questionCount: 9,
      questions,
    };
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: checkpointRoom,
    });
    vi.mocked(saveBalanceResponse).mockResolvedValue(
      createSavedResponse("food_8", "food_8_a"),
    );

    render(<BalanceGameRoom roomCode="ABC234" />);

    fireEvent.click(await screen.findByRole("button", { name: "선택 A 8" }));
    expect(
      await screen.findByRole("heading", { name: "9번째 질문" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("1라운드 선택 저장 완료"),
    ).not.toBeInTheDocument();
  });

  it("restores the selected answer when moving to a previous question", async () => {
    render(<BalanceGameRoom roomCode="ABC234" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "이전 선택 보기" }),
    );
    expect(
      screen.getByRole("button", { name: "후라이드 치킨" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the optimistic selection and offers retry when saving fails", async () => {
    vi.mocked(saveBalanceResponse).mockRejectedValue(new Error("저장 실패"));

    render(<BalanceGameRoom roomCode="ABC234" />);

    fireEvent.click(await screen.findByRole("button", { name: "짜장면" }));
    expect(
      await screen.findByText(
        "연결이 불안정해 선택을 저장하지 못했어요. 다시 시도해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "짜장면" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "다시 저장" }),
    ).toBeInTheDocument();
  });

  it("shows only my pair result details after the group result opens", async () => {
    const resultRoom: BalanceRoomState = {
      ...answeredRoom,
      currentParticipantCount: 2,
      participants: [
        {
          ...answeredRoom.participants[0],
          completedAt: "2026-07-31T00:00:00.000Z",
          profileImage: {
            alt: "민지 프로필 이미지",
            source: "user_uploaded",
            src: "https://example.com/minji-profile.webp",
          },
          status: "completed",
        },
        {
          answeredCount: 2,
          completedAt: "2026-07-31T00:00:01.000Z",
          id: "participant-other",
          isMe: false,
          isOwner: false,
          nickname: "하린",
          status: "completed",
        },
      ],
      result: {
        comparedQuestionCount: 2,
        completedParticipantCount: 2,
        groupLabel: "자주 통하는 팀",
        groupScore: 75,
        isFinal: true,
        pairCount: 1,
        pairResults: [
          {
            answers: [
              {
                id: "food_001",
                isMatch: true,
                myOptionText: "후라이드 치킨",
                otherOptionText: "후라이드 치킨",
                prompt: "치킨 한 마리를 고른다면?",
                subtopic: "치킨",
              },
            ],
            comparedCount: 2,
            matchCount: 1,
            otherParticipantId: "participant-other",
            otherParticipantNickname: "하린",
            score: 50,
          },
        ],
        splitQuestions: [],
        unanimousQuestions: [
          {
            counts: [
              {
                count: 2,
                optionId: "food_001_a",
                optionText: "후라이드 치킨",
              },
              {
                count: 0,
                optionId: "food_001_b",
                optionText: "양념 치킨",
              },
            ],
            id: "food_001",
            isUnanimous: true,
            prompt: "치킨 한 마리를 고른다면?",
            subtopic: "치킨",
          },
        ],
      },
      resultStatus: "final",
      targetParticipantCount: 2,
    };
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: resultRoom,
    });

    render(<BalanceGameRoom resultView roomCode="ABC234" />);

    expect(await screen.findByText("75")).toBeInTheDocument();
    expect(
      Array.from(document.querySelectorAll("[data-result-hero-character]")).map(
        (node) => node.getAttribute("data-result-hero-character"),
      ),
    ).toEqual(["purple", "water", "sun"]);
    expect(
      document.querySelectorAll("[data-result-scene-character]"),
    ).toHaveLength(2);
    const allProfileTab = screen.getByRole("tab", {
      name: "모두의 결과 보기",
    });
    expect(allProfileTab.querySelectorAll("img")).toHaveLength(3);
    expect(
      screen.getByRole("tab", { name: "나의 선택 보기" }).querySelector("img"),
    ).toHaveAttribute("src", "https://example.com/minji-profile.webp");
    expect(
      screen
        .getByRole("tab", { name: "하린과 비교" })
        .querySelector("img")
        ?.getAttribute("src"),
    ).toContain("nuang-character-flame.webp");
    expect(screen.getByText("2문항씩 · 1개 1:1 조합 평균")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /치킨 한 마리를 고른다면/ }),
    );
    expect(screen.getByText("나 · 하린")).toBeInTheDocument();
    const fullProgress = screen.getByRole("progressbar", {
      name: "후라이드 치킨, 완료자 2명 중 2명, 100퍼센트",
    });
    expect(fullProgress).toHaveAttribute("aria-valuenow", "2");
    expect(
      fullProgress.querySelector('[data-wave-boundary="vertical"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "양념 치킨, 완료자 2명 중 0명, 0퍼센트",
      }).firstElementChild,
    ).toHaveAttribute("data-empty", "true");

    fireEvent.click(screen.getByRole("tab", { name: "하린과 비교" }));

    expect(
      screen.getByRole("heading", {
        name: "하린과 2개 중 1개가 같아요",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("같이 얘기해 볼 것")).toBeInTheDocument();
    expect(screen.getByText("둘의 선택")).toBeInTheDocument();
    expect(screen.getByText(/둘 다/)).toBeInTheDocument();
    expect(screen.getByText("후라이드 치킨")).toBeInTheDocument();
  });

  it("keeps invitation actions visible while a current result has open seats", async () => {
    const currentResultRoom: BalanceRoomState = {
      ...answeredRoom,
      currentParticipantCount: 2,
      participants: [
        {
          ...answeredRoom.participants[0],
          completedAt: "2026-07-31T00:00:00.000Z",
          status: "completed",
        },
        {
          ...answeredRoom.participants[0],
          id: "participant-other",
          isMe: false,
          isOwner: false,
          nickname: "하린",
          status: "completed",
        },
      ],
      result: {
        comparedQuestionCount: 2,
        completedParticipantCount: 2,
        groupLabel: "자주 통하는 팀",
        groupScore: 75,
        isFinal: false,
        pairCount: 1,
        pairResults: [],
        splitQuestions: [],
        unanimousQuestions: [],
      },
      resultStatus: "current",
      targetParticipantCount: 3,
    };
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: currentResultRoom,
    });

    render(<BalanceGameRoom resultView roomCode="ABC234" />);

    expect(
      await screen.findByText("아직 자리가 남아 있어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "초대 링크 보내기" }),
    ).toBeInTheDocument();
  });

  it("lets a feed-room owner remove an unfinished disruptive participant and refreshes the room", async () => {
    const disruptiveRoom: BalanceRoomState = {
      ...answeredRoom,
      currentParticipantCount: 2,
      participationMode: "feed_group",
      participants: [
        {
          ...answeredRoom.participants[0],
          completedAt: "2026-07-31T00:00:00.000Z",
          status: "completed",
        },
        {
          answeredCount: 0,
          completedAt: null,
          id: "participant-disruptive",
          isMe: false,
          isOwner: false,
          nickname: "방해자",
          status: "active",
        },
      ],
    };
    const refreshedRoom: BalanceRoomState = {
      ...disruptiveRoom,
      currentParticipantCount: 1,
      participants: [disruptiveRoom.participants[0]],
    };
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: disruptiveRoom,
    });
    vi.mocked(removeBalanceParticipant).mockResolvedValue({
      ok: true,
      room: refreshedRoom,
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<BalanceGameRoom resultView roomCode="ABC234" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "방해자 내보내기" }),
    );

    expect(confirm).toHaveBeenCalledWith(
      "방해자 님을 내보낼까요?\n내보내면 이 방에 다시 참여할 수 없어요.",
    );
    await waitFor(() =>
      expect(removeBalanceParticipant).toHaveBeenCalledWith(
        "ABC234",
        "participant-disruptive",
        expect.any(String),
      ),
    );
    expect(
      await screen.findByText(
        "방해자 님을 내보냈어요. 이 방에는 다시 참여할 수 없어요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "방해자 내보내기" }),
    ).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it("does not expose participant removal controls to another participant", async () => {
    const nonOwnerRoom: BalanceRoomState = {
      ...answeredRoom,
      currentParticipantCount: 3,
      isOwner: false,
      targetParticipantCount: 3,
      participants: [
        {
          ...answeredRoom.participants[0],
          isOwner: false,
          completedAt: "2026-07-31T00:00:00.000Z",
          status: "completed",
        },
        {
          answeredCount: 2,
          completedAt: "2026-07-31T00:00:01.000Z",
          id: "participant-owner",
          isMe: false,
          isOwner: true,
          nickname: "방장",
          status: "completed",
        },
        {
          answeredCount: 0,
          completedAt: null,
          id: "participant-other",
          isMe: false,
          isOwner: false,
          nickname: "하린",
          status: "active",
        },
      ],
    };
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: nonOwnerRoom,
    });

    render(<BalanceGameRoom resultView roomCode="ABC234" />);

    expect(await screen.findByText("하린")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "하린 내보내기" }),
    ).not.toBeInTheDocument();
  });

  it("shows the owner when removing an unfinished participant fails", async () => {
    const waitingRoom: BalanceRoomState = {
      ...answeredRoom,
      currentParticipantCount: 2,
      participants: [
        {
          ...answeredRoom.participants[0],
          completedAt: "2026-07-31T00:00:00.000Z",
          status: "completed",
        },
        {
          answeredCount: 1,
          completedAt: null,
          id: "participant-other",
          isMe: false,
          isOwner: false,
          nickname: "하린",
          status: "active",
        },
      ],
    };
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: waitingRoom,
    });
    vi.mocked(removeBalanceParticipant).mockRejectedValue(
      new Error("참여자를 내보내지 못했어요."),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<BalanceGameRoom resultView roomCode="ABC234" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "하린 내보내기" }),
    );

    expect(
      await screen.findByText("참여자를 내보내지 못했어요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "하린 내보내기" })).toBeEnabled();
    confirm.mockRestore();
  });

  it("shows a clear message when result sharing fails", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("clipboard denied")),
      },
    });
    vi.mocked(readBalanceRoom).mockResolvedValue({
      ok: true,
      room: {
        ...answeredRoom,
        participants: [
          {
            ...answeredRoom.participants[0],
            completedAt: "2026-07-31T00:00:00.000Z",
            status: "completed",
          },
        ],
        result: {
          comparedQuestionCount: 2,
          completedParticipantCount: 2,
          groupLabel: "자주 통하는 팀",
          groupScore: 75,
          isFinal: true,
          pairCount: 1,
          pairResults: [],
          splitQuestions: [],
          unanimousQuestions: [],
        },
        resultStatus: "final",
      },
    });

    render(<BalanceGameRoom resultView roomCode="ABC234" />);

    fireEvent.click(
      (
        await screen.findAllByRole("button", {
          name: "결과 이미지 공유",
        })
      )[0],
    );
    expect(
      await screen.findByText(
        "결과를 공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("offers login recovery when a feed-room join requires authentication", async () => {
    vi.mocked(readParticipantSession).mockReturnValue(null);
    vi.mocked(readBalanceRoomPreview).mockResolvedValue({
      ok: true,
      room: {
        ...roomPreview,
        participationMode: "feed_group",
      },
    });
    vi.mocked(joinBalanceRoom).mockRejectedValue(
      new BalanceApiClientError(
        {
          code: "feed_auth_required",
          message: "이 방은 로그인한 사용자만 참여할 수 있어요.",
          ok: false,
          retryable: false,
        },
        401,
      ),
    );

    render(<BalanceGameRoom roomCode="ABC234" />);

    fireEvent.change(await screen.findByLabelText("방에서 사용할 닉네임"), {
      target: { value: "하린" },
    });
    expect(
      screen.getByText(
        "시작하면 결과가 열린 뒤 이 방 참여자끼리 닉네임과 문항별 선택을 볼 수 있어요.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "자리 잡고 시작하기" }));

    expect(joinBalanceRoom).toHaveBeenCalledWith(
      "ABC234",
      expect.objectContaining({
        answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
        nickname: "하린",
      }),
    );
    expect(
      await screen.findByRole("link", {
        name: "로그인하고 이 방으로 돌아오기",
      }),
    ).toHaveAttribute(
      "href",
      "/login?next=%2Fassessments%2Ftogether%2Fbalance-game%2Frooms%2FABC234&reason=community",
    );
  });
});
