"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  QrCode,
  RefreshCw,
  Share2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BalanceApiError,
  BalancePairResultView,
  BalanceRoomPreview,
  BalanceRoomParticipantView,
  BalanceRoomQuestionView,
  BalanceRoomState,
} from "@/features/together-balance/api-contract";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "@/features/together-balance/constants";
import {
  BalanceApiClientError,
  clearParticipantSession,
  completeBalanceRoom,
  finalizeBalanceRoom,
  joinBalanceRoom,
  readCachedBalanceRoom,
  readBalanceRoom,
  readBalanceRoomPreview,
  readParticipantSession,
  removeBalanceParticipant,
  saveBalanceResponse,
  shareBalanceRoomToFeed,
} from "@/features/together-balance/client";
import {
  ResultAvatar,
  ResultBackIcon,
  ResultCheckIcon,
  ResultChevronIcon,
  ResultCopyIcon,
  ResultDuoArtwork,
  ResultGroupAvatar,
  ResultQrIcon,
  ResultSceneBadge,
  ResultShareIcon,
} from "./BalanceResultArtwork";
import styles from "./BalanceGameRoom.module.css";

type ScreenState =
  | { kind: "loading" }
  | { kind: "preview"; preview: BalanceRoomPreview }
  | { kind: "room"; room: BalanceRoomState }
  | {
      kind: "error";
      code?: BalanceApiError["code"];
      message: string;
      recoverable: boolean;
    };

export function BalanceGameRoom({
  resultView = false,
  roomCode,
}: {
  resultView?: boolean;
  roomCode: string;
}) {
  const router = useRouter();
  const normalizedCode = roomCode.trim().toUpperCase();
  const [screen, setScreen] = useState<ScreenState>({ kind: "loading" });
  const handleRoomChange = useCallback((room: BalanceRoomState) => {
    setScreen({ kind: "room", room });
  }, []);
  const handleRoomError = useCallback((error: unknown) => {
    if (!(error instanceof BalanceApiClientError) || error.retryable) {
      return;
    }
    setScreen({
      code: error.code,
      kind: "error",
      message: error.message,
      recoverable: false,
    });
  }, []);

  useEffect(() => {
    let active = true;
    void load();
    return () => {
      active = false;
    };

    async function load() {
      try {
        if (readParticipantSession(normalizedCode)) {
          const cachedRoom = readCachedBalanceRoom(normalizedCode);
          if (cachedRoom && active) {
            setScreen({ kind: "room", room: cachedRoom });
          }
          const result = await readBalanceRoom(normalizedCode);
          if (active) setScreen({ kind: "room", room: result.room });
        } else {
          const result = await readBalanceRoomPreview(normalizedCode);
          if (active) setScreen({ kind: "preview", preview: result.room });
        }
      } catch (error) {
        if (!active) return;
        let loadError = error;
        if (
          error instanceof BalanceApiClientError &&
          error.code === "participant_unauthorized"
        ) {
          clearParticipantSession(normalizedCode);
          try {
            const result = await readBalanceRoomPreview(normalizedCode);
            if (active) setScreen({ kind: "preview", preview: result.room });
            return;
          } catch (previewError) {
            loadError = previewError;
          }
        }
        setScreen({
          code:
            loadError instanceof BalanceApiClientError
              ? loadError.code
              : undefined,
          kind: "error",
          message:
            loadError instanceof Error
              ? loadError.message
              : "방을 불러오지 못했어요.",
          recoverable:
            !(loadError instanceof BalanceApiClientError) ||
            loadError.retryable,
        });
      }
    }
  }, [normalizedCode]);

  const activeParticipant =
    screen.kind === "room"
      ? screen.room.participants.find((participant) => participant.isMe)
      : null;
  const participantCompleted = activeParticipant?.status === "completed";

  useEffect(() => {
    if (screen.kind !== "room") return;
    const roomPath = `/assessments/together/balance-game/rooms/${encodeURIComponent(
      normalizedCode,
    )}`;
    if (!resultView && participantCompleted) {
      router.replace(`${roomPath}/result`);
    } else if (resultView && !participantCompleted) {
      router.replace(roomPath);
    }
  }, [normalizedCode, participantCompleted, resultView, router, screen.kind]);

  if (screen.kind === "loading") return <RoomLoading />;
  if (screen.kind === "error") {
    return (
      <RoomError
        code={screen.code}
        message={screen.message}
        onRetry={() => window.location.reload()}
        recoverable={screen.recoverable}
      />
    );
  }
  if (screen.kind === "preview") {
    return (
      <JoinRoom
        onJoined={(room) => setScreen({ kind: "room", room })}
        preview={screen.preview}
      />
    );
  }
  return (
    <ActiveRoom
      onRoomError={handleRoomError}
      onRoomChange={handleRoomChange}
      room={screen.room}
    />
  );
}

function JoinRoom({
  onJoined,
  preview,
}: {
  onJoined: (room: BalanceRoomState) => void;
  preview: BalanceRoomPreview;
}) {
  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const joinRequestRef = useRef<{ id: string; nickname: string } | null>(null);
  const isClosed = preview.joinStatus !== "open";

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedNickname = readJoinNicknameDraft(preview.roomCode);
      if (savedNickname) setNickname(savedNickname);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [preview.roomCode]);

  return (
    <RoomShell
      backHref="/assessments/together/balance-game"
      title={preview.roomName}
    >
      <main className={styles.joinPage}>
        <section className={styles.joinHero}>
          <small>{preview.hostNickname} 님이 초대했어요</small>
          <h2>{preview.pack.title}</h2>
          <p>{preview.pack.description}</p>
          <div className={styles.roomFacts}>
            <span>
              <Users aria-hidden="true" size={17} />
              {preview.currentParticipantCount}/{preview.targetParticipantCount}
              명 참여 중
            </span>
            <span>
              {preview.questionCount}문항 · 약{" "}
              {getEstimatedPlayMinutes(preview.questionCount)}분
            </span>
          </div>
        </section>

        {isClosed ? (
          <section className={styles.closedState}>
            <strong>
              {preview.joinStatus === "full"
                ? "이 방은 다 찼어요"
                : "참여가 마감된 방이에요"}
            </strong>
            <p>같은 주제로 새 방을 만들면 바로 이어서 즐길 수 있어요.</p>
            <Link
              href={`/assessments/together/balance-game/setup?pack=${encodeURIComponent(
                preview.pack.slug,
              )}`}
            >
              같은 주제로 방 만들기
            </Link>
          </section>
        ) : (
          <form className={styles.joinForm} onSubmit={handleJoin}>
            <label>
              <span>방에서 사용할 닉네임</span>
              <input
                autoComplete="nickname"
                autoFocus
                maxLength={16}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setRequiresLogin(false);
                  setStatus("");
                }}
                placeholder="예: 민지"
                required
                value={nickname}
              />
            </label>
            {status ? (
              <p className={styles.inlineError} role="alert">
                {status}
              </p>
            ) : null}
            {requiresLogin ? (
              <Link
                className={styles.loginRecovery}
                href={`/login?next=${encodeURIComponent(
                  `/assessments/together/balance-game/rooms/${preview.roomCode}`,
                )}&reason=community`}
              >
                로그인하고 이 방으로 돌아오기
              </Link>
            ) : null}
            <p className={styles.revealConsent}>
              시작하면 결과가 열린 뒤 이 방 참여자끼리 닉네임과 문항별 선택을 볼
              수 있어요.
            </p>
            <button disabled={!nickname.trim() || joining} type="submit">
              {joining ? "자리를 잡고 있어요…" : "자리 잡고 시작하기"}
            </button>
          </form>
        )}
      </main>
    </RoomShell>
  );

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nickname.trim() || joining) return;
    setJoining(true);
    setStatus("");
    setRequiresLogin(false);
    const normalizedNickname = nickname.trim();
    if (joinRequestRef.current?.nickname !== normalizedNickname) {
      joinRequestRef.current = {
        id: createClientRequestId(),
        nickname: normalizedNickname,
      };
    }
    try {
      const result = await joinBalanceRoom(preview.roomCode, {
        answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
        clientRequestId: joinRequestRef.current.id,
        nickname: normalizedNickname,
      });
      clearJoinNicknameDraft(preview.roomCode);
      onJoined(result.room);
    } catch (error) {
      if (
        error instanceof BalanceApiClientError &&
        error.code === "feed_auth_required"
      ) {
        writeJoinNicknameDraft(preview.roomCode, normalizedNickname);
        setRequiresLogin(true);
      }
      setStatus(
        error instanceof Error
          ? error.message
          : "참여하지 못했어요. 다시 시도해 주세요.",
      );
      setJoining(false);
    }
  }
}

function ActiveRoom({
  onRoomError,
  onRoomChange,
  room,
}: {
  onRoomError: (error: unknown) => void;
  onRoomChange: (room: BalanceRoomState) => void;
  room: BalanceRoomState;
}) {
  const me = room.participants.find((participant) => participant.isMe);
  const completed = me?.status === "completed";
  const [ownerStarted, setOwnerStarted] = useState(false);
  const ownerIsInviting =
    room.isOwner && (me?.answeredCount ?? 0) === 0 && !ownerStarted;

  useRoomPolling({
    active:
      ownerIsInviting || (completed && room.resultStatus !== "final"),
    intervalMs: completed
      ? room.resultStatus === "waiting"
        ? 1_500
        : 2_500
      : 3_000,
    onError: onRoomError,
    onRoomChange,
    roomCode: room.roomCode,
  });

  if (completed && room.result) {
    return <RoomResult onRoomChange={onRoomChange} room={room} />;
  }
  if (completed) {
    return <RoomWaiting onRoomChange={onRoomChange} room={room} />;
  }
  if (ownerIsInviting) {
    return <RoomStart onStart={() => setOwnerStarted(true)} room={room} />;
  }
  return <QuestionRunner onRoomChange={onRoomChange} room={room} />;
}

function RoomStart({
  onStart,
  room,
}: {
  onStart: () => void;
  room: BalanceRoomState;
}) {
  return (
    <RoomShell
      backHref="/assessments/together/balance-game"
      title={room.roomName}
    >
      <main className={styles.startPage}>
        <section className={styles.startHero}>
          <small>방이 준비됐어요</small>
          <h2>먼저 초대하고, 나는 바로 골라볼까요?</h2>
          <p>
            친구는 각자 편한 시간에 참여할 수 있어요. 내 선택은 결과가 열리기
            전까지 보이지 않아요.
          </p>
          <div className={styles.roomFacts}>
            <span>
              <Users aria-hidden="true" size={17} />
              {room.currentParticipantCount}/{room.targetParticipantCount}명
            </span>
            <span>
              {room.questionCount}문항 · 약{" "}
              {getEstimatedPlayMinutes(room.questionCount)}분
            </span>
          </div>
        </section>
        <InviteActions room={room} />
        <section className={styles.startAction}>
          <button onClick={onStart} type="button">
            내 선택 시작하기
            <ChevronRight aria-hidden="true" size={18} />
          </button>
          <p>답변을 마치면 대기 화면에서도 다시 초대할 수 있어요.</p>
        </section>
      </main>
    </RoomShell>
  );
}

export function QuestionRunner({
  onRoomChange,
  previewMode = false,
  room,
}: {
  onRoomChange: (room: BalanceRoomState) => void;
  previewMode?: boolean;
  room: BalanceRoomState;
}) {
  const firstUnanswered = room.questions.findIndex(
    (question) => !question.responseOptionId,
  );
  const [index, setIndex] = useState(
    firstUnanswered < 0 ? room.questions.length - 1 : firstUnanswered,
  );
  const [optimisticSelections, setOptimisticSelections] = useState<
    Record<string, string>
  >({});
  const [failedSelection, setFailedSelection] = useState<{
    message: string;
    optionId: string;
    questionId: string;
  } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lockedQuestionIds, setLockedQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [completing, setCompleting] = useState(false);
  const [completionFailed, setCompletionFailed] = useState(false);
  const [status, setStatus] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(true);
  const lockedQuestionIdsRef = useRef(new Set<string>());
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const queueGenerationRef = useRef(0);
  const completionQueuedRef = useRef(false);
  const completionRequestRef = useRef<string | null>(null);
  const transitionTimersRef = useRef<number[]>([]);
  const confirmedSelectionsRef = useRef<Record<string, string>>(
    Object.fromEntries(
      room.questions.flatMap((item) =>
        item.responseOptionId ? [[item.id, item.responseOptionId]] : [],
      ),
    ),
  );
  const question = room.questions[index];
  const selectedId = question
    ? (optimisticSelections[question.id] ?? question.responseOptionId ?? null)
    : null;
  const answeredCount = room.questions.filter(
    (item) => optimisticSelections[item.id] || item.responseOptionId,
  ).length;
  const serverAnsweredCount = room.questions.filter(
    (item) => item.responseOptionId,
  ).length;
  const questionHeadingId = question
    ? `balance-question-${question.id}`
    : undefined;

  useEffect(() => {
    mountedRef.current = true;
    const transitionTimers = transitionTimersRef.current;
    return () => {
      mountedRef.current = false;
      transitionTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    for (const item of room.questions) {
      if (item.responseOptionId) {
        confirmedSelectionsRef.current[item.id] = item.responseOptionId;
      }
    }
  }, [room.questions]);

  if (!question) {
    return (
      <RoomError
        code="question_not_found"
        message="이 방의 질문을 불러오지 못했어요."
        onRetry={() => window.location.reload()}
        recoverable
      />
    );
  }

  return (
    <main className={styles.runner}>
      <header className={styles.runnerHeader}>
        <Link aria-label="방 나가기" href="/assessments/together/balance-game">
          <X aria-hidden="true" size={22} />
        </Link>
        <strong title={room.pack.title}>{room.pack.title}</strong>
        <button
          aria-label="이전 선택 보기"
          className={styles.runnerPrevious}
          disabled={index === 0 || completing}
          onClick={() => moveTo(index - 1)}
          type="button"
        >
          이전 선택
        </button>
      </header>
      <div
        aria-label={`${index + 1}/${room.questionCount} 진행`}
        aria-valuemax={room.questionCount}
        aria-valuemin={1}
        aria-valuenow={index + 1}
        className={styles.runnerProgress}
        role="progressbar"
      >
        <span
          style={{
            transform: `scaleX(${(index + 1) / room.questionCount})`,
          }}
        />
      </div>

      <section
        aria-labelledby={questionHeadingId}
        className={styles.questionStage}
        key={question.id}
        role="group"
      >
        <div className={styles.questionMeta}>
          <span className={styles.questionTopic}>
            {question.subtopic || "밸런스 선택"}
          </span>
          <small>
            {pendingCount > 0
              ? "선택 저장 중"
              : `${String(index + 1).padStart(2, "0")} / ${String(
                  room.questionCount,
                ).padStart(2, "0")}`}
          </small>
        </div>
        <h1 id={questionHeadingId} ref={headingRef} tabIndex={-1}>
          {question.prompt}
        </h1>
        <p>지금 더 끌리는 쪽을 골라주세요.</p>

        <div className={styles.optionPair}>
          <ChoiceButton
            disabled={lockedQuestionIds.has(question.id) || completing}
            onSelect={() => void choose(question.options[0].id)}
            option={question.options[0]}
            selected={selectedId === question.options[0].id}
          />
          <span aria-hidden="true" className={styles.vs}>
            VS
          </span>
          <ChoiceButton
            disabled={lockedQuestionIds.has(question.id) || completing}
            onSelect={() => void choose(question.options[1].id)}
            option={question.options[1]}
            selected={selectedId === question.options[1].id}
          />
        </div>

        {failedSelection?.questionId === question.id ? (
          <div className={styles.answerError} role="alert">
            <span>{failedSelection.message}</span>
            <button
              onClick={() => void choose(failedSelection.optionId)}
              type="button"
            >
              다시 저장
            </button>
          </div>
        ) : null}
        {completionFailed ? (
          <div className={styles.answerError} role="alert">
            <span>선택은 모두 저장됐어요. 결과 준비만 다시 시도해 주세요.</span>
            <button onClick={() => void finish()} type="button">
              결과 다시 준비
            </button>
          </div>
        ) : null}
        {serverAnsweredCount === room.questions.length &&
        !completing &&
        !failedSelection &&
        !completionFailed ? (
          <div className={styles.completionRecovery}>
            <span>선택은 모두 저장되어 있어요.</span>
            <button onClick={() => void finish()} type="button">
              결과 보기
            </button>
          </div>
        ) : null}
        <p aria-live="polite" className={styles.saveStatus}>
          {status ||
            (completing
              ? "마지막 선택을 저장하고 결과를 준비하고 있어요."
              : pendingCount > 0
                ? "선택을 저장하면서 다음 문항을 보여드렸어요."
                : `${answeredCount}개 선택 완료`)}
        </p>
      </section>
    </main>
  );

  async function choose(optionId: string) {
    if (
      lockedQuestionIdsRef.current.has(question.id) ||
      completing ||
      completionQueuedRef.current
    ) {
      return;
    }
    const selectedQuestion = question;
    const selectedIndex = index;

    if (previewMode) {
      setOptimisticSelections((current) => ({
        ...current,
        [selectedQuestion.id]: optionId,
      }));
      setFailedSelection(null);
      setCompletionFailed(false);
      setStatus("");
      if (selectedIndex < room.questions.length - 1) {
        const reduceMotion =
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
          false;
        const timer = window.setTimeout(
          () => {
            if (!mountedRef.current) return;
            setIndex(selectedIndex + 1);
            requestAnimationFrame(() => headingRef.current?.focus());
          },
          reduceMotion ? 0 : 180,
        );
        transitionTimersRef.current.push(timer);
      } else {
        setStatus("마지막 선택이에요. 실제 서비스에서는 바로 결과를 준비해요.");
      }
      return;
    }

    const generation = queueGenerationRef.current;
    lockedQuestionIdsRef.current.add(selectedQuestion.id);
    setLockedQuestionIds((current) => {
      const next = new Set(current);
      next.add(selectedQuestion.id);
      return next;
    });
    setOptimisticSelections((current) => ({
      ...current,
      [selectedQuestion.id]: optionId,
    }));
    setFailedSelection(null);
    setCompletionFailed(false);
    setStatus("");
    setPendingCount((count) => count + 1);

    if (selectedIndex < room.questions.length - 1) {
      const reduceMotion =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false;
      const timer = window.setTimeout(
        () => {
          if (!mountedRef.current || generation !== queueGenerationRef.current)
            return;
          setIndex(selectedIndex + 1);
          requestAnimationFrame(() => headingRef.current?.focus());
        },
        reduceMotion ? 0 : 180,
      );
      transitionTimersRef.current.push(timer);
    } else {
      setCompleting(true);
    }

    const queuedSave = async () => {
      if (!mountedRef.current || generation !== queueGenerationRef.current) {
        return;
      }
      let removePending = true;
      try {
        const saved = await saveBalanceResponse(
          room.roomCode,
          selectedQuestion.id,
          { optionId },
        );
        if (!mountedRef.current || generation !== queueGenerationRef.current) {
          return;
        }
        if (
          saved.saved.questionId !== selectedQuestion.id ||
          saved.saved.optionId !== optionId
        ) {
          throw new Error("선택 저장을 확인하지 못했어요. 다시 눌러 주세요.");
        }
        confirmedSelectionsRef.current[selectedQuestion.id] = optionId;
        const locallySavedRoom: BalanceRoomState = {
          ...room,
          questions: room.questions.map((item) => ({
            ...item,
            responseOptionId:
              confirmedSelectionsRef.current[item.id] ?? item.responseOptionId,
          })),
        };
        onRoomChange(locallySavedRoom);
        lockedQuestionIdsRef.current.delete(selectedQuestion.id);
        setLockedQuestionIds((current) => {
          const next = new Set(current);
          next.delete(selectedQuestion.id);
          return next;
        });
        if (locallySavedRoom.questions.every((item) => item.responseOptionId)) {
          await finish(locallySavedRoom);
        }
      } catch (error) {
        if (!mountedRef.current || generation !== queueGenerationRef.current) {
          return;
        }
        queueGenerationRef.current += 1;
        lockedQuestionIdsRef.current.clear();
        setLockedQuestionIds(new Set());
        setPendingCount(0);
        removePending = false;
        setCompleting(false);
        completionQueuedRef.current = false;
        setIndex(selectedIndex);
        setFailedSelection({
          message: getFriendlyBalanceError(error),
          optionId,
          questionId: selectedQuestion.id,
        });
        requestAnimationFrame(() => headingRef.current?.focus());
      } finally {
        if (
          removePending &&
          mountedRef.current &&
          generation === queueGenerationRef.current
        ) {
          setPendingCount((count) => Math.max(0, count - 1));
        }
      }
    };

    saveQueueRef.current = saveQueueRef.current.then(queuedSave, queuedSave);
  }

  async function finish(latestRoom: BalanceRoomState = room) {
    if (completionQueuedRef.current) return;
    completionQueuedRef.current = true;
    setCompleting(true);
    setCompletionFailed(false);
    setStatus("모든 선택을 저장했어요. 결과를 준비할게요.");
    completionRequestRef.current ??= createClientRequestId();
    try {
      const completedResult = await completeBalanceRoom(
        latestRoom.roomCode,
        completionRequestRef.current,
      );
      if (!mountedRef.current) return;
      onRoomChange(completedResult.room);
    } catch (error) {
      if (!mountedRef.current) return;
      completionQueuedRef.current = false;
      setCompleting(false);
      setCompletionFailed(true);
      setStatus(getFriendlyBalanceError(error));
    }
  }

  function moveTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= room.questions.length) return;
    setIndex(nextIndex);
    setFailedSelection(null);
    setCompletionFailed(false);
    setStatus("");
    requestAnimationFrame(() => headingRef.current?.focus());
  }
}

function ChoiceButton({
  disabled,
  onSelect,
  option,
  selected,
}: {
  disabled: boolean;
  onSelect: () => void;
  option: BalanceRoomQuestionView["options"][number];
  selected: boolean;
}) {
  return (
    <button
      aria-label={option.text}
      aria-pressed={selected}
      className={styles.option}
      data-position={option.position}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <span aria-hidden="true" className={styles.choiceMarker}>
        {option.position === "left" ? "A" : "B"}
      </span>
      {selected ? (
        <span aria-hidden="true" className={styles.choiceSelected}>
          내 선택
        </span>
      ) : null}
      <span aria-hidden="true" className={styles.choiceVisual}>
        <span className={styles.choiceOrbit} />
        <span className={styles.choiceCore} />
      </span>
      <span className={styles.choiceText}>{option.text}</span>
      <span aria-hidden="true" className={styles.choiceTap}>
        탭해서 선택
      </span>
    </button>
  );
}

function RoomWaiting({
  onRoomChange,
  room,
}: {
  onRoomChange: (room: BalanceRoomState) => void;
  room: BalanceRoomState;
}) {
  const completedCount = room.participants.filter(
    (participant) => participant.status === "completed",
  ).length;
  const needed = Math.max(0, 2 - completedCount);

  return (
    <RoomShell
      backHref="/assessments/together/balance-game"
      title={room.roomName}
    >
      <main className={styles.waitingPage}>
        <section className={styles.waitingHero}>
          <span>
            <Check aria-hidden="true" size={26} />
          </span>
          <small>내 선택 저장 완료</small>
          <h2>
            {needed > 0
              ? "한 명만 더 끝내면 결과가 열려요"
              : "결과를 준비하고 있어요"}
          </h2>
          <p>
            {completedCount}/{room.targetParticipantCount}명 완료
          </p>
        </section>
        <ParticipantList onRoomChange={onRoomChange} room={room} />
        <InviteActions room={room} />
      </main>
    </RoomShell>
  );
}

export function RoomResult({
  onRoomChange,
  previewMode = false,
  room,
}: {
  onRoomChange: (room: BalanceRoomState) => void;
  previewMode?: boolean;
  room: BalanceRoomState;
}) {
  const result = room.result;
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [finalizing, setFinalizing] = useState(false);
  const [feedSharing, setFeedSharing] = useState(false);
  const [status, setStatus] = useState("");
  if (!result) return null;
  const me = room.participants.find((participant) => participant.isMe) ?? null;
  const selectedPair =
    result.pairResults.find(
      (pair) => pair.otherParticipantId === selectedProfileId,
    ) ?? null;
  const selectedSelf = selectedProfileId === room.myParticipantId;
  const heroValue = selectedSelf
    ? (me?.answeredCount ?? room.questionCount)
    : (selectedPair?.score ?? result.groupScore);
  const heroUnit = selectedSelf ? "개" : "%";
  const heroTitle = selectedSelf
    ? `내가 고른 ${heroValue}개 답이에요`
    : selectedPair
      ? `${selectedPair.otherParticipantNickname}과 ${selectedPair.comparedCount}개 중 ${selectedPair.matchCount}개가 같아요`
      : `전체 선택 중 ${result.groupScore}%가 같았어요`;

  return (
    <RoomShell
      backIcon={<ResultBackIcon />}
      backHref="/assessments/together/balance-game"
      title="우리의 선택"
    >
      <main className={styles.resultPage}>
        <section className={styles.resultHero}>
          <ResultDuoArtwork
            mode={selectedSelf ? "self" : selectedPair ? "pair" : "group"}
          />
          <small>우리의 선택 · {result.completedParticipantCount}명 완료</small>
          <h2>{heroTitle}</h2>
          <div className={styles.resultScore}>
            <strong>
              {heroValue}
              <em>{heroUnit}</em>
            </strong>
            <span>{selectedSelf ? "내 선택" : room.pack.resultLabel}</span>
          </div>
          {!result.isFinal ? (
            <aside>
              {room.currentParticipantCount - result.completedParticipantCount >
              0
                ? `${room.currentParticipantCount - result.completedParticipantCount}명 선택 중 · 완료하면 결과가 업데이트돼요.`
                : "친구가 더 참여하면 결과가 업데이트돼요."}
            </aside>
          ) : null}
        </section>

        <ResultProfileSelector
          onSelect={setSelectedProfileId}
          room={room}
          selectedProfileId={selectedProfileId}
        />

        {selectedPair ? (
          <>
            <PairRelationshipPanel pair={selectedPair} room={room} />
            <ConversationStarter pair={selectedPair} />
            <PairComparison pair={selectedPair} />
          </>
        ) : (
          <>
            {selectedSelf ? (
              <section className={styles.selfResultNotice} role="tabpanel">
                <ResultAvatar
                  label={me?.nickname ?? "나"}
                  participantIndex={room.participants.findIndex(
                    (participant) => participant.id === room.myParticipantId,
                  )}
                  profileImage={me?.profileImage}
                  seed={me?.avatarSeed ?? room.myParticipantId}
                  size="small"
                />
                <p>
                  내가 고른 답은 게이지 아래에서 <strong>내 선택</strong>으로
                  표시했어요.
                </p>
              </section>
            ) : null}

            {result.unanimousQuestions.length > 0 ? (
              <ResultQuestionSection
                description="모두가 같은 답을 선택했어요."
                questions={result.unanimousQuestions}
                room={room}
                scene="unanimous"
                selectedParticipantId={
                  selectedSelf ? room.myParticipantId : null
                }
                title="모두의 선택"
              />
            ) : null}

            {result.splitQuestions.length > 0 ? (
              <ResultQuestionSection
                description="서로 왜 골랐는지 이야기해 보세요."
                questions={result.splitQuestions}
                room={room}
                scene="different"
                selectedParticipantId={
                  selectedSelf ? room.myParticipantId : null
                }
                title="서로 다른 선택"
              />
            ) : null}
          </>
        )}

        {!result.isFinal &&
        room.currentParticipantCount < room.targetParticipantCount ? (
          <div className={styles.resultRecruit}>
            <div className={styles.resultRecruitHeading}>
              <div>
                <h2>아직 자리가 남아 있어요</h2>
                <p>친구가 선택을 마치면 결과에 바로 반영돼요.</p>
              </div>
              <ResultSceneBadge scene="invite" />
            </div>
            <InviteActions resultIcons room={room} />
          </div>
        ) : null}

        <section className={styles.resultActions}>
          <button
            className={styles.primaryResultAction}
            onClick={() => {
              if (!previewMode) void handleResultShare();
            }}
            type="button"
          >
            <ResultShareIcon />
            결과 이미지 공유
          </button>
          <Link href="/assessments/together/balance-game">
            다른 주제로 한 판 더
          </Link>
          {room.canShareToFeed ? (
            <button
              disabled={feedSharing}
              onClick={() => void handleFeedShare()}
              type="button"
            >
              {feedSharing ? "피드에 올리는 중…" : "피드에 결과 공유"}
            </button>
          ) : null}
          {room.canFinalize && !result.isFinal ? (
            <button
              disabled={finalizing}
              onClick={() => void handleFinalize()}
              type="button"
            >
              {finalizing ? "마감하고 있어요…" : "지금 결과로 마감"}
            </button>
          ) : null}
          {status ? (
            <p className={styles.actionStatus} role="status">
              {status}
            </p>
          ) : null}
        </section>

        <details className={styles.resultDisclosure}>
          <summary>점수 기준 보기</summary>
          <div className={styles.resultBasis}>
            <p>{getResultBasisCopy(room)}</p>
            <span>
              {result.comparedQuestionCount}문항씩 · {result.pairCount}개 1:1
              조합 평균
            </span>
          </div>
        </details>

        <details className={styles.resultDisclosure}>
          <summary>참여자와 방 관리</summary>
          <ParticipantList onRoomChange={onRoomChange} room={room} />
        </details>
      </main>
    </RoomShell>
  );

  async function handleResultShare() {
    const message = await shareResult(room);
    if (message) setStatus(message);
  }

  async function handleFinalize() {
    if (
      !window.confirm(
        "아직 선택 중인 사람은 이번 결과에서 빠져요. 이 인원으로 마감할까요?",
      )
    ) {
      return;
    }
    setFinalizing(true);
    setStatus("");
    try {
      const response = await finalizeBalanceRoom(
        room.roomCode,
        createClientRequestId(),
      );
      onRoomChange(response.room);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "마감하지 못했어요.");
    } finally {
      setFinalizing(false);
    }
  }

  async function handleFeedShare() {
    setFeedSharing(true);
    setStatus("");
    try {
      const response = await shareBalanceRoomToFeed(
        room.roomCode,
        createClientRequestId(),
      );
      onRoomChange(response.room);
      setStatus("참여자 이름과 개인 답변 없이 결과만 피드에 공유했어요.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "결과를 피드에 공유하지 못했어요.",
      );
    } finally {
      setFeedSharing(false);
    }
  }
}

function ResultProfileSelector({
  onSelect,
  room,
  selectedProfileId,
}: {
  onSelect: (participantId: string | null) => void;
  room: BalanceRoomState;
  selectedProfileId: string | null;
}) {
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const pairByParticipantId = new Map(
    (room.result?.pairResults ?? []).map((pair) => [
      pair.otherParticipantId,
      pair,
    ]),
  );
  const options = [
    { available: true, id: null, participant: null },
    ...room.participants.map((participant) => ({
      available: participant.isMe || pairByParticipantId.has(participant.id),
      id: participant.id,
      participant,
    })),
  ];

  return (
    <section className={styles.resultProfiles}>
      <header>
        <h2>누구와 비교할까요?</h2>
        <p>프로필을 눌러 선택을 비교해 보세요.</p>
      </header>
      <div aria-label="결과 비교 대상" role="tablist">
        {options.map((option, index) => {
          const selected = selectedProfileId === option.id;
          const participant = option.participant;
          const unavailableCopy =
            participant?.status === "completed" ? "비교 비공개" : "선택 중";
          return (
            <button
              aria-controls="balance-result-comparison"
              aria-disabled={!option.available}
              aria-label={
                participant
                  ? participant.isMe
                    ? "나의 선택 보기"
                    : option.available
                      ? `${participant.nickname}과 비교`
                      : `${participant.nickname} ${unavailableCopy}`
                  : "모두의 결과 보기"
              }
              aria-selected={selected}
              disabled={!option.available}
              key={option.id ?? "all"}
              onClick={() => onSelect(option.id)}
              onKeyDown={(event) => handleProfileArrow(event, index)}
              ref={(node) => {
                tabsRef.current[index] = node;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {participant ? (
                <ResultAvatar
                  label={participant.nickname}
                  participantIndex={index - 1}
                  profileImage={participant.profileImage}
                  seed={participant.avatarSeed ?? participant.id}
                />
              ) : (
                <ResultGroupAvatar />
              )}
              <strong>
                {participant
                  ? participant.isMe
                    ? "나"
                    : participant.nickname
                  : "모두"}
              </strong>
              <small>
                {participant
                  ? participant.isMe
                    ? "내 선택"
                    : option.available
                      ? "비교하기"
                      : unavailableCopy
                  : `${room.result?.completedParticipantCount ?? 0}명`}
              </small>
            </button>
          );
        })}
      </div>
    </section>
  );

  function handleProfileArrow(
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    let nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : currentIndex;
    for (let offset = 0; offset < options.length; offset += 1) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        nextIndex = (nextIndex + direction + options.length) % options.length;
      }
      const next = options[nextIndex];
      if (next?.available) {
        onSelect(next.id);
        tabsRef.current[nextIndex]?.focus();
        return;
      }
      if (event.key === "Home") nextIndex += 1;
      if (event.key === "End") nextIndex -= 1;
    }
  }
}

function PairRelationshipPanel({
  pair,
  room,
}: {
  pair: BalancePairResultView;
  room: BalanceRoomState;
}) {
  const me = room.participants.find((participant) => participant.isMe) ?? null;
  const otherParticipant =
    room.participants.find(
      (participant) => participant.id === pair.otherParticipantId,
    ) ?? null;
  const myParticipantIndex = room.participants.findIndex(
    (participant) => participant.isMe,
  );
  const otherParticipantIndex = room.participants.findIndex(
    (participant) => participant.id === pair.otherParticipantId,
  );
  const differenceCount = pair.comparedCount - pair.matchCount;
  return (
    <section
      className={styles.relationshipPanel}
      id="balance-result-comparison"
      role="tabpanel"
    >
      <div className={styles.relationshipPeople}>
        <span>
          <ResultAvatar
            label={me?.nickname ?? "나"}
            participantIndex={myParticipantIndex}
            profileImage={me?.profileImage}
            seed={me?.avatarSeed ?? room.myParticipantId}
          />
          <small>나</small>
        </span>
        <i aria-hidden="true" />
        <span>
          <ResultAvatar
            label={pair.otherParticipantNickname}
            participantIndex={otherParticipantIndex}
            profileImage={otherParticipant?.profileImage}
            seed={
              otherParticipant?.avatarSeed ??
              pair.otherParticipantAvatarSeed ??
              pair.otherParticipantId
            }
          />
          <small>{pair.otherParticipantNickname}</small>
        </span>
      </div>
      <div className={styles.relationshipStats}>
        <p>
          <span>같은 선택</span>
          <strong>{pair.matchCount}</strong>
        </p>
        <p>
          <span>다른 선택</span>
          <strong>{differenceCount}</strong>
        </p>
      </div>
      <a href="#pair-comparison">
        둘의 선택 자세히 보기
        <ResultChevronIcon />
      </a>
    </section>
  );
}

function ConversationStarter({ pair }: { pair: BalancePairResultView }) {
  const same = pair.answers.find((answer) => answer.isMatch);
  const different = pair.answers.find((answer) => !answer.isMatch);
  const starters = [
    same
      ? {
          prompt: same.prompt,
          question: "“왜 이걸 골랐어?”",
          title: "같은 답에서 시작하기",
        }
      : null,
    different
      ? {
          prompt: different.prompt,
          question: "“왜 그 답을 골랐어?”",
          title: "다른 답에서 시작하기",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  if (starters.length === 0) return null;

  return (
    <section className={styles.conversationSection}>
      <header>
        <h2>같이 얘기해 볼 것</h2>
        <p>답을 고른 이유부터 가볍게 물어보세요.</p>
      </header>
      <div>
        {starters.map((starter) => (
          <article key={starter.title}>
            <small>{starter.title}</small>
            <strong>{starter.question}</strong>
            <p>{starter.prompt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PairComparison({ pair }: { pair: BalancePairResultView }) {
  const [filter, setFilter] = useState<"all" | "match" | "difference">("all");
  const answers = pair.answers.filter((answer) => {
    if (filter === "match") return answer.isMatch;
    if (filter === "difference") return !answer.isMatch;
    return true;
  });

  return (
    <section className={styles.pairComparison} id="pair-comparison">
      <header>
        <h2>둘의 선택</h2>
        <p>{pair.comparedCount}개 답을 나란히 비교했어요.</p>
      </header>
      <div aria-label="답변 비교 필터" className={styles.pairFilters}>
        {[
          ["all", "전체"],
          ["match", "같은 답"],
          ["difference", "다른 답"],
        ].map(([id, label]) => (
          <button
            aria-pressed={filter === id}
            key={id}
            onClick={() => setFilter(id as "all" | "match" | "difference")}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.answerList}>
        {answers.map((answer) => (
          <article data-match={answer.isMatch} key={answer.id}>
            <small>{answer.subtopic}</small>
            <h3>{answer.prompt}</h3>
            {answer.isMatch ? (
              <p>
                <ResultCheckIcon />둘 다 <strong>{answer.myOptionText}</strong>
              </p>
            ) : (
              <div>
                <p>
                  <span>나</span>
                  <strong>{answer.myOptionText}</strong>
                </p>
                <p>
                  <span>{pair.otherParticipantNickname}</span>
                  <strong>{answer.otherOptionText}</strong>
                </p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ResultQuestionSection({
  description,
  questions,
  room,
  scene,
  selectedParticipantId,
  title,
}: {
  description: string;
  questions: NonNullable<BalanceRoomState["result"]>["splitQuestions"];
  room: BalanceRoomState;
  scene: "different" | "unanimous";
  selectedParticipantId: string | null;
  title: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visibleQuestions = showAll ? questions : questions.slice(0, 3);
  const completedCount = room.result?.completedParticipantCount ?? 0;
  return (
    <section className={styles.resultSection}>
      <header className={styles.resultSectionHeader}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <ResultSceneBadge scene={scene} />
      </header>
      <div className={styles.questionResultList}>
        {visibleQuestions.map((question) => {
          const choices = getQuestionChoicePeople(question, room);
          const expanded = openId === question.id;
          return (
            <article key={question.id}>
              <button
                aria-expanded={expanded}
                onClick={() =>
                  setOpenId((current) =>
                    current === question.id ? null : question.id,
                  )
                }
                type="button"
              >
                <span>
                  <small>{question.subtopic}</small>
                  <strong>{question.prompt}</strong>
                </span>
                <ResultChevronIcon className={styles.resultChevron} />
              </button>
              <div className={styles.countBars}>
                {question.counts.map((count, countIndex) => {
                  const choice = choices.find(
                    (item) => item.optionText === count.optionText,
                  );
                  const percentage =
                    completedCount > 0
                      ? Math.round((count.count / completedCount) * 100)
                      : 0;
                  const selectedHere = Boolean(
                    selectedParticipantId &&
                    choice?.people.some(
                      (person) => person.id === selectedParticipantId,
                    ),
                  );
                  return (
                    <div
                      className={styles.countBarItem}
                      data-selected={selectedHere}
                      data-tone={
                        scene === "different" && countIndex === 1
                          ? "water"
                          : "purple"
                      }
                      key={count.optionId}
                    >
                      <div className={styles.countBarLabel}>
                        <span>{count.optionText}</span>
                        <b>
                          {count.count}/{completedCount}명
                        </b>
                      </div>
                      <div
                        aria-label={`${count.optionText}, 완료자 ${completedCount}명 중 ${count.count}명, ${percentage}퍼센트`}
                        aria-valuemax={completedCount}
                        aria-valuemin={0}
                        aria-valuenow={count.count}
                        className={styles.distributionTrack}
                        role="progressbar"
                      >
                        <span
                          className={styles.distributionFill}
                          data-empty={percentage === 0}
                          data-full={percentage === 100}
                          style={{ width: `${percentage}%` }}
                        >
                          <span
                            aria-hidden="true"
                            className={styles.distributionWaveEdge}
                            data-wave-boundary="vertical"
                          >
                            <svg preserveAspectRatio="none" viewBox="0 0 20 72">
                              <rect
                                className={styles.distributionWaveSurface}
                                height="72"
                                width="20"
                              />
                              <path
                                className={styles.distributionWaveShape}
                                d="M0 0H10C12 2 12 4 10 6C8 8 8 10 10 12C12 14 12 16 10 18C8 20 8 22 10 24C12 26 12 28 10 30C8 32 8 34 10 36C12 38 12 40 10 42C8 44 8 46 10 48C12 50 12 52 10 54C8 56 8 58 10 60C12 62 12 64 10 66C8 68 8 70 10 72H0Z"
                              />
                            </svg>
                          </span>
                        </span>
                      </div>
                      <div className={styles.countBarPeople}>
                        <ResultPeopleStack
                          hiddenCount={choice?.hiddenCount ?? count.count}
                          people={choice?.people ?? []}
                        />
                        {selectedHere ? <small>내 선택</small> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {expanded ? (
                <div className={styles.choicePeople}>
                  {choices.map((choice) => (
                    <div key={choice.optionText}>
                      <strong>{choice.optionText}</strong>
                      <span>
                        {choice.people.length > 0
                          ? choice.people
                              .map((person) =>
                                person.isMe ? "나" : person.nickname,
                              )
                              .join(" · ")
                          : choice.hiddenCount > 0
                            ? ""
                            : "선택한 사람 없음"}
                        {choice.hiddenCount > 0
                          ? `${choice.people.length > 0 ? " · " : ""}이름 미표시 ${choice.hiddenCount}명`
                          : ""}
                      </span>
                    </div>
                  ))}
                  <small>왜 골랐는지 이야기해 보세요.</small>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {questions.length > 3 ? (
        <button
          className={styles.showMoreResults}
          onClick={() => setShowAll((current) => !current)}
          type="button"
        >
          {showAll ? "핵심만 보기" : `${questions.length - 3}개 더 보기`}
        </button>
      ) : null}
    </section>
  );
}

function ResultPeopleStack({
  hiddenCount,
  people,
}: {
  hiddenCount: number;
  people: ResultChoicePerson[];
}) {
  const visiblePeople = people.slice(0, 5);
  const overflowCount = hiddenCount + Math.max(0, people.length - 5);
  if (visiblePeople.length === 0 && overflowCount === 0) {
    return <span className={styles.emptyPeople}>선택한 사람 없음</span>;
  }
  return (
    <span aria-hidden="true" className={styles.resultPeopleStack}>
      {visiblePeople.map((person) => (
        <ResultAvatar
          key={person.id}
          label={person.nickname}
          participantIndex={person.participantIndex}
          profileImage={person.profileImage}
          seed={person.avatarSeed}
          size="small"
        />
      ))}
      {overflowCount > 0 ? <b>+{overflowCount}</b> : null}
    </span>
  );
}

type ResultChoicePerson = {
  avatarSeed: string;
  id: string;
  isMe: boolean;
  nickname: string;
  participantIndex: number;
  profileImage?: BalanceRoomParticipantView["profileImage"];
};

function getQuestionChoicePeople(
  question: NonNullable<BalanceRoomState["result"]>["splitQuestions"][number],
  room: BalanceRoomState,
) {
  const peopleByOptionText = new Map(
    question.counts.map((count) => [
      count.optionText,
      [] as ResultChoicePerson[],
    ]),
  );
  const me = room.participants.find((participant) => participant.isMe);
  const ownQuestion = room.questions.find((item) => item.id === question.id);
  const ownOption = ownQuestion?.options.find(
    (option) => option.id === ownQuestion.responseOptionId,
  );
  if (me && ownOption) {
    peopleByOptionText.get(ownOption.text)?.push({
      avatarSeed: me.avatarSeed ?? me.id,
      id: me.id,
      isMe: true,
      nickname: me.nickname,
      participantIndex: room.participants.findIndex(
        (participant) => participant.id === me.id,
      ),
      profileImage: me.profileImage,
    });
  }
  for (const pair of room.result?.pairResults ?? []) {
    const answer = pair.answers.find((item) => item.id === question.id);
    if (!answer) continue;
    const participant = room.participants.find(
      (item) => item.id === pair.otherParticipantId,
    );
    if (!participant) continue;
    peopleByOptionText.get(answer.otherOptionText)?.push({
      avatarSeed:
        participant.avatarSeed ??
        pair.otherParticipantAvatarSeed ??
        participant.id,
      id: participant.id,
      isMe: false,
      nickname: participant.nickname,
      participantIndex: room.participants.findIndex(
        (item) => item.id === participant.id,
      ),
      profileImage: participant.profileImage,
    });
  }
  return question.counts.map((count) => {
    const people = peopleByOptionText.get(count.optionText) ?? [];
    return {
      hiddenCount: Math.max(0, count.count - people.length),
      optionText: count.optionText,
      people,
    };
  });
}

function ParticipantList({
  onRoomChange,
  room,
}: {
  onRoomChange: (room: BalanceRoomState) => void;
  room: BalanceRoomState;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  return (
    <section className={styles.participantSection}>
      <header>
        <h2>함께하는 사람</h2>
        <span>
          {room.currentParticipantCount}/{room.targetParticipantCount}명
        </span>
      </header>
      <div>
        {room.participants.map((participant) => {
          const canRemove =
            room.isOwner &&
            !participant.isMe &&
            !participant.isOwner &&
            ["active", "reserved"].includes(participant.status);
          return (
            <article key={participant.id}>
              <span aria-hidden="true">{participant.nickname.slice(0, 1)}</span>
              <strong>
                {participant.nickname}
                {participant.isMe ? " · 나" : ""}
                {participant.isOwner ? " · 방장" : ""}
              </strong>
              <div className={styles.participantMeta}>
                <small>
                  {participant.status === "completed"
                    ? "선택 완료"
                    : participant.status === "reserved"
                      ? "자리 확인 중"
                      : `${participant.answeredCount}/${room.questionCount} 선택 중`}
                </small>
                {canRemove ? (
                  <button
                    aria-label={`${participant.nickname} 내보내기`}
                    disabled={removingId !== null}
                    onClick={() => void handleRemove(participant)}
                    type="button"
                  >
                    {removingId === participant.id
                      ? "내보내는 중…"
                      : "내보내기"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {status ? (
        <p className={styles.participantStatus} role="status">
          {status}
        </p>
      ) : null}
    </section>
  );

  async function handleRemove(
    participant: BalanceRoomState["participants"][number],
  ) {
    if (
      !window.confirm(
        `${participant.nickname} 님을 내보낼까요?\n내보내면 이 방에 다시 참여할 수 없어요.`,
      )
    ) {
      return;
    }

    setRemovingId(participant.id);
    setStatus("");
    try {
      const response = await removeBalanceParticipant(
        room.roomCode,
        participant.id,
        createClientRequestId(),
      );
      onRoomChange(response.room);
      setStatus(
        `${participant.nickname} 님을 내보냈어요. 이 방에는 다시 참여할 수 없어요.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "참여자를 내보내지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    } finally {
      setRemovingId(null);
    }
  }
}

function InviteActions({
  resultIcons = false,
  room,
}: {
  resultIcons?: boolean;
  room: BalanceRoomState;
}) {
  const [status, setStatus] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  return (
    <section className={styles.inviteActions}>
      <div className={styles.roomCode}>
        <span>참여 코드</span>
        <strong>{room.roomCode}</strong>
        <button onClick={() => void copyCode()} type="button">
          코드 복사
        </button>
      </div>
      <button onClick={() => void shareInvite()} type="button">
        {resultIcons ? (
          <ResultShareIcon size={19} />
        ) : (
          <Share2 aria-hidden="true" size={19} />
        )}
        초대 링크 보내기
      </button>
      <button onClick={() => void copyInvite()} type="button">
        {resultIcons ? (
          <ResultCopyIcon size={18} />
        ) : (
          <Copy aria-hidden="true" size={18} />
        )}
        링크 복사
      </button>
      <button
        disabled={qrLoading}
        onClick={() => void toggleQr()}
        type="button"
      >
        {resultIcons ? (
          <ResultQrIcon size={18} />
        ) : (
          <QrCode aria-hidden="true" size={18} />
        )}
        {qrLoading ? "QR 만드는 중…" : qrDataUrl ? "QR 닫기" : "QR로 초대"}
      </button>
      {qrDataUrl ? (
        <div className={styles.qrPanel}>
          {/* A data URL avoids sending private-room links to an external QR service. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${room.roomName} 초대 QR 코드`}
            height={220}
            src={qrDataUrl}
            width={220}
          />
          <strong>{room.roomCode}</strong>
          <p>카메라로 스캔하면 이 방으로 바로 들어와요.</p>
        </div>
      ) : null}
      {status ? (
        <p aria-live="polite" role="status">
          {status}
        </p>
      ) : null}
    </section>
  );

  async function shareInvite() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          text: `나랑 얼마나 비슷하게 고르는지 해볼래? ${room.pack.title} ${room.questionCount}문항`,
          title: room.roomName,
          url,
        });
        setStatus("초대 화면을 열었어요.");
        return;
      } catch (error) {
        if (isShareCanceled(error)) return;
      }
    }
    await copyInvite();
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("초대 링크를 복사했어요.");
    } catch {
      setStatus("링크를 복사하지 못했어요.");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setStatus("참여 코드를 복사했어요.");
    } catch {
      setStatus("참여 코드를 복사하지 못했어요.");
    }
  }

  async function toggleQr() {
    if (qrDataUrl) {
      setQrDataUrl(null);
      return;
    }
    setQrLoading(true);
    try {
      const { toDataURL } = await import("qrcode");
      const dataUrl = await toDataURL(window.location.href, {
        color: {
          dark: "#3f315d",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
        margin: 2,
        width: 440,
      });
      setQrDataUrl(dataUrl);
      setStatus("QR 코드를 열었어요.");
    } catch {
      setStatus("QR 코드를 만들지 못했어요.");
    } finally {
      setQrLoading(false);
    }
  }
}

function RoomShell({
  backAction,
  backHref,
  backIcon,
  children,
  title,
  trailing,
}: {
  backAction?: () => void;
  backHref?: string;
  backIcon?: React.ReactNode;
  children: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
}) {
  const back = backAction ? (
    <button aria-label="이전 화면" onClick={backAction} type="button">
      {backIcon ?? <ArrowLeft aria-hidden="true" size={23} />}
    </button>
  ) : (
    <Link
      aria-label="밸런스 게임으로 돌아가기"
      href={backHref ?? "/home?view=together"}
    >
      {backIcon ?? <ArrowLeft aria-hidden="true" size={23} />}
    </Link>
  );
  return (
    <div className={styles.roomShell}>
      <header className={styles.roomHeader}>
        {back}
        <h1>{title}</h1>
        <span>{trailing}</span>
      </header>
      {children}
    </div>
  );
}

function RoomLoading() {
  return (
    <div className={styles.centerState}>
      <RefreshCw aria-hidden="true" className={styles.spin} size={25} />
      <strong>방을 불러오고 있어요</strong>
    </div>
  );
}

function RoomError({
  code,
  message,
  onRetry,
  recoverable,
}: {
  code?: BalanceApiError["code"];
  message: string;
  onRetry: () => void;
  recoverable: boolean;
}) {
  return (
    <div className={styles.centerState} role="alert">
      <strong>{message}</strong>
      <p>{getRoomErrorGuidance(code)}</p>
      {recoverable ? (
        <button onClick={onRetry} type="button">
          다시 불러오기
        </button>
      ) : null}
      <Link href="/assessments/together/balance-game">다른 주제 보기</Link>
    </div>
  );
}

function useRoomPolling({
  active,
  intervalMs,
  onError,
  onRoomChange,
  roomCode,
}: {
  active: boolean;
  intervalMs: number;
  onError?: (error: unknown) => void;
  onRoomChange: (room: BalanceRoomState) => void;
  roomCode: string;
}) {
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let inFlight = false;

    async function refresh() {
      if (document.visibilityState === "hidden" || inFlight) return;
      inFlight = true;
      try {
        const response = await readBalanceRoom(roomCode);
        if (!stopped) onRoomChange(response.room);
      } catch (error) {
        onError?.(error);
      } finally {
        inFlight = false;
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), intervalMs);
    const handleVisibility = () => void refresh();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [active, intervalMs, onError, onRoomChange, roomCode]);
}

function getRoomErrorGuidance(code?: BalanceApiError["code"]) {
  if (code === "participant_removed") {
    return "이 방에는 다시 참여할 수 없어요. 다른 주제로 새 게임을 시작해 보세요.";
  }
  if (code === "room_closed") {
    return "이 방의 결과는 이미 확정됐어요. 같은 주제로 새 방을 만들 수 있어요.";
  }
  if (code === "room_expired") {
    return "참여 기간이 끝났어요. 같은 주제로 새 방을 만들어 이어가세요.";
  }
  if (code === "participant_unauthorized") {
    return "참여 정보가 만료됐어요. 초대 링크를 다시 열어 주세요.";
  }
  return "초대 링크를 다시 확인하거나 새 방을 시작해 보세요.";
}

function getEstimatedPlayMinutes(questionCount: number) {
  if (questionCount <= 8) return 1;
  if (questionCount <= 16) return 2;
  if (questionCount <= 20) return 3;
  return 4;
}

async function shareResult(room: BalanceRoomState) {
  if (!room.result) return "";
  const text = `${room.roomName}의 ${room.pack.resultLabel}는 ${room.result.groupScore}점! 우리도 얼마나 비슷한지 해볼래?`;
  const url = `${window.location.origin}/assessments/together/balance-game/setup?pack=${encodeURIComponent(
    room.pack.slug,
  )}`;
  if (navigator.share) {
    try {
      await navigator.share({
        text,
        title: `${room.pack.title} 결과`,
        url,
      });
      return "결과 공유 화면을 열었어요.";
    } catch (error) {
      if (isShareCanceled(error)) return "";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "결과 문구와 링크를 복사했어요.";
  } catch {
    return "결과를 공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
  }
}

function isShareCanceled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getFriendlyBalanceError(error: unknown) {
  if (error instanceof BalanceApiClientError) {
    if (error.code === "participant_removed") {
      return "방에서 나간 상태라 더 이상 선택을 저장할 수 없어요.";
    }
    if (error.code === "room_closed") {
      return "결과가 확정되어 선택이 마감됐어요.";
    }
    if (error.code === "room_expired") {
      return "참여 기간이 끝난 방이에요.";
    }
    if (error.code === "participant_unauthorized") {
      return "참여 정보를 다시 확인해야 해요. 방을 다시 열어 주세요.";
    }
    return error.message;
  }
  if (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return "연결이 오래 걸리고 있어요. 선택은 그대로 두었으니 다시 저장해 주세요.";
  }
  return "연결이 불안정해 선택을 저장하지 못했어요. 다시 시도해 주세요.";
}

function getResultBasisCopy(room: BalanceRoomState) {
  if (room.pack.scoringTemplate === "ideal_preference") {
    return "완주자끼리 끌리는 모습이 얼마나 겹쳤는지 비교한 값이에요. 참여자 서로의 연애 궁합을 뜻하지 않아요.";
  }
  if (room.pack.scoringTemplate === "dilemma_fun") {
    return "극한 선택에서 같은 답을 고른 비율을 비교한 놀이 점수예요. 실제 생활 궁합을 판정하지 않아요.";
  }
  return "완주자 두 명씩 같은 선택을 고른 비율을 계산한 뒤, 모든 1:1 조합을 같은 비중으로 평균했어요.";
}

const joinNicknameDraftStoragePrefix =
  "nuang.together-balance.join-nickname.v1:";

function readJoinNicknameDraft(roomCode: string) {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.sessionStorage.getItem(
        `${joinNicknameDraftStoragePrefix}${roomCode.toUpperCase()}`,
      ) ?? ""
    );
  } catch {
    return "";
  }
}

function writeJoinNicknameDraft(roomCode: string, nickname: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${joinNicknameDraftStoragePrefix}${roomCode.toUpperCase()}`,
      nickname,
    );
  } catch {
    // The login recovery link remains usable without storage.
  }
}

function clearJoinNicknameDraft(roomCode: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(
      `${joinNicknameDraftStoragePrefix}${roomCode.toUpperCase()}`,
    );
  } catch {
    // No cleanup is required when storage is unavailable.
  }
}

function createClientRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `balance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
