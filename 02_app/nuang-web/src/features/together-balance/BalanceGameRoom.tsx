"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  QrCode,
  RefreshCw,
  Share2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BalanceApiError,
  BalancePairResultView,
  BalanceRoomPreview,
  BalanceRoomQuestionView,
  BalanceRoomState,
} from "@/features/together-balance/api-contract";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "@/features/together-balance/api-contract";
import {
  BalanceApiClientError,
  clearParticipantSession,
  completeBalanceRoom,
  finalizeBalanceRoom,
  joinBalanceRoom,
  readBalanceRoom,
  readBalanceRoomPreview,
  readParticipantSession,
  removeBalanceParticipant,
  saveBalanceResponse,
  shareBalanceRoomToFeed,
} from "@/features/together-balance/client";
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

export function BalanceGameRoom({ roomCode }: { roomCode: string }) {
  const normalizedCode = roomCode.trim().toUpperCase();
  const [screen, setScreen] = useState<ScreenState>({ kind: "loading" });
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
      onRoomChange={(room) => setScreen({ kind: "room", room })}
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
              href={`/assessments/together/balance-game?pack=${preview.pack.slug}`}
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
    active: true,
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

function QuestionRunner({
  onRoomChange,
  room,
}: {
  onRoomChange: (room: BalanceRoomState) => void;
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
        role="group"
      >
        <div className={styles.questionMeta}>
          <span>
            {index + 1}/{room.questionCount}
          </span>
          <small>
            {pendingCount > 0
              ? `${pendingCount}개 저장 중`
              : getProgressCopy(index, room.questionCount)}
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
        reduceMotion ? 0 : 140,
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
        const savedQuestion = saved.room.questions.find(
          (item) => item.id === selectedQuestion.id,
        );
        if (savedQuestion?.responseOptionId !== optionId) {
          throw new Error("선택 저장을 확인하지 못했어요. 다시 눌러 주세요.");
        }
        onRoomChange(saved.room);
        lockedQuestionIdsRef.current.delete(selectedQuestion.id);
        setLockedQuestionIds((current) => {
          const next = new Set(current);
          next.delete(selectedQuestion.id);
          return next;
        });
        if (saved.room.questions.every((item) => item.responseOptionId)) {
          await finish(saved.room);
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
      aria-pressed={selected}
      className={styles.option}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <span>{option.text}</span>
      <b>{selected ? <Check aria-hidden="true" size={20} /> : null}</b>
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

function RoomResult({
  onRoomChange,
  room,
}: {
  onRoomChange: (room: BalanceRoomState) => void;
  room: BalanceRoomState;
}) {
  const result = room.result;
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [feedSharing, setFeedSharing] = useState(false);
  const [status, setStatus] = useState("");
  if (!result) return null;
  const selectedPair =
    result.pairResults.find(
      (pair) => pair.otherParticipantId === selectedPairId,
    ) ?? null;

  if (selectedPair) {
    return (
      <PairResult
        onBack={() => setSelectedPairId(null)}
        pair={selectedPair}
        resultLabel={room.pack.resultLabel}
      />
    );
  }

  return (
    <RoomShell
      backHref="/assessments/together/balance-game"
      title={room.roomName}
    >
      <main className={styles.resultPage}>
        <section className={styles.resultHero}>
          <small>{result.isFinal ? "최종 결과" : "현재 결과"}</small>
          <p>{room.pack.resultLabel}</p>
          <strong>
            {result.groupScore}
            <em>점</em>
          </strong>
          <h2>{result.groupLabel}</h2>
          <span>
            {room.targetParticipantCount}명 정원 ·{" "}
            {result.completedParticipantCount}명 완료
          </span>
          {!result.isFinal ? (
            <aside>새 사람이 완료하면 현재 결과가 달라질 수 있어요.</aside>
          ) : null}
        </section>

        {result.pairResults.length > 0 ? (
          <section className={`${styles.resultSection} ${styles.pairSection}`}>
            <header>
              <h2>한 명씩 비교해 보기</h2>
              <p>누구와 어디서 통했는지 확인해 보세요.</p>
            </header>
            <div className={styles.pairList}>
              {result.pairResults.map((pair) => (
                <button
                  key={pair.otherParticipantId}
                  onClick={() => setSelectedPairId(pair.otherParticipantId)}
                  type="button"
                >
                  <span>
                    <strong>{pair.otherParticipantNickname} 님과 나</strong>
                    <small>
                      {pair.comparedCount}개 중 {pair.matchCount}개 같은 선택
                    </small>
                  </span>
                  <span>
                    {pair.score}점
                    <ChevronRight
                      aria-hidden="true"
                      size={17}
                      strokeWidth={1.8}
                    />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {result.unanimousQuestions.length > 0 ? (
          <ResultQuestionSection
            description="모두 같은 쪽을 고른 선택이에요."
            pairResults={result.pairResults}
            questions={result.unanimousQuestions}
            title="다 같이 통했어요"
          />
        ) : null}

        {result.splitQuestions.length > 0 ? (
          <ResultQuestionSection
            description="함께 정하기 전에 한 번 얘기해 보면 좋아요."
            pairResults={result.pairResults}
            questions={result.splitQuestions}
            title="여기서는 갈렸어요"
          />
        ) : null}

        {!result.isFinal &&
        room.currentParticipantCount < room.targetParticipantCount ? (
          <div className={styles.resultRecruit}>
            <h2>아직 자리가 남아 있어요</h2>
            <p>초대받은 사람이 완료하면 현재 결과가 새로 계산돼요.</p>
            <InviteActions room={room} />
          </div>
        ) : null}

        <section className={styles.resultActions}>
          <button
            className={styles.primaryResultAction}
            onClick={() => void handleResultShare()}
            type="button"
          >
            <Share2 aria-hidden="true" size={18} />
            결과 공유하기
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
              {finalizing ? "마감하고 있어요…" : "이 인원으로 마감"}
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

function PairResult({
  onBack,
  pair,
  resultLabel,
}: {
  onBack: () => void;
  pair: BalancePairResultView;
  resultLabel: string;
}) {
  const [filter, setFilter] = useState<"all" | "match" | "difference">("all");
  const answers = pair.answers.filter((answer) => {
    if (filter === "match") return answer.isMatch;
    if (filter === "difference") return !answer.isMatch;
    return true;
  });

  return (
    <RoomShell
      backAction={onBack}
      title={`${pair.otherParticipantNickname} 님과 나`}
    >
      <main className={styles.pairPage}>
        <section className={styles.pairHero}>
          <small>{resultLabel}</small>
          <strong>
            {pair.score}
            <em>점</em>
          </strong>
          <h2>
            {pair.comparedCount}개 중 {pair.matchCount}개가 같아요
          </h2>
        </section>
        <div aria-label="답변 비교 필터" className={styles.pairFilters}>
          {[
            ["all", "전체"],
            ["match", "같은 선택"],
            ["difference", "다른 선택"],
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
        <section className={styles.answerList}>
          {answers.map((answer) => (
            <article data-match={answer.isMatch} key={answer.id}>
              <small>{answer.subtopic}</small>
              <h3>{answer.prompt}</h3>
              {answer.isMatch ? (
                <p>
                  <Check aria-hidden="true" size={17} />둘 다{" "}
                  <strong>{answer.myOptionText}</strong>
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
        </section>
      </main>
    </RoomShell>
  );
}

function ResultQuestionSection({
  description,
  pairResults,
  questions,
  title,
}: {
  description: string;
  pairResults: BalancePairResultView[];
  questions: NonNullable<BalanceRoomState["result"]>["splitQuestions"];
  title: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visibleQuestions = showAll ? questions : questions.slice(0, 3);
  return (
    <section className={styles.resultSection}>
      <header>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className={styles.questionResultList}>
        {visibleQuestions.map((question) => (
          <article key={question.id}>
            <button
              aria-expanded={openId === question.id}
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
              <ChevronDown aria-hidden="true" size={18} />
            </button>
            <div className={styles.countBars}>
              {question.counts.map((count) => (
                <p key={count.optionId}>
                  <span>{count.optionText}</span>
                  <b>{count.count}명</b>
                </p>
              ))}
            </div>
            {openId === question.id ? (
              <div className={styles.choicePeople}>
                {getQuestionChoicePeople(question, pairResults).map(
                  (choice) => (
                    <p key={choice.optionText}>
                      <strong>{choice.optionText}</strong>
                      <span>{choice.people.join(" · ")}</span>
                    </p>
                  ),
                )}
                <small>왜 이쪽을 골랐는지 서로 물어보세요.</small>
              </div>
            ) : null}
          </article>
        ))}
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

function getQuestionChoicePeople(
  question: NonNullable<BalanceRoomState["result"]>["splitQuestions"][number],
  pairResults: BalancePairResultView[],
) {
  const peopleByOptionText = new Map(
    question.counts.map((count) => [count.optionText, [] as string[]]),
  );
  const firstAnswer = pairResults
    .flatMap((pair) => pair.answers)
    .find((answer) => answer.id === question.id);
  if (firstAnswer) {
    peopleByOptionText.get(firstAnswer.myOptionText)?.push("나");
  }
  for (const pair of pairResults) {
    const answer = pair.answers.find((item) => item.id === question.id);
    if (!answer) continue;
    peopleByOptionText
      .get(answer.otherOptionText)
      ?.push(pair.otherParticipantNickname);
  }
  return question.counts.map((count) => {
    const people = peopleByOptionText.get(count.optionText) ?? [];
    return {
      optionText: count.optionText,
      people:
        count.count === 0
          ? ["선택한 사람 없음"]
          : people.length === count.count
            ? people
            : [...people, `이름 미표시 ${count.count - people.length}명`],
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

function InviteActions({ room }: { room: BalanceRoomState }) {
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
        <Share2 aria-hidden="true" size={19} />
        초대 링크 보내기
      </button>
      <button onClick={() => void copyInvite()} type="button">
        <Copy aria-hidden="true" size={18} />
        링크 복사
      </button>
      <button
        disabled={qrLoading}
        onClick={() => void toggleQr()}
        type="button"
      >
        <QrCode aria-hidden="true" size={18} />
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
  children,
  title,
  trailing,
}: {
  backAction?: () => void;
  backHref?: string;
  children: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
}) {
  const back = backAction ? (
    <button aria-label="이전 화면" onClick={backAction} type="button">
      <ArrowLeft aria-hidden="true" size={23} />
    </button>
  ) : (
    <Link
      aria-label="밸런스 게임으로 돌아가기"
      href={backHref ?? "/home?view=together"}
    >
      <ArrowLeft aria-hidden="true" size={23} />
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
  onError,
  onRoomChange,
  roomCode,
}: {
  active: boolean;
  onError?: (error: unknown) => void;
  onRoomChange: (room: BalanceRoomState) => void;
  roomCode: string;
}) {
  useEffect(() => {
    if (!active) return;
    let stopped = false;

    async function refresh() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await readBalanceRoom(roomCode);
        if (!stopped) onRoomChange(response.room);
      } catch (error) {
        onError?.(error);
      }
    }

    const interval = window.setInterval(() => void refresh(), 5_000);
    const handleVisibility = () => void refresh();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [active, onError, onRoomChange, roomCode]);
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

function getProgressCopy(index: number, total: number) {
  const remaining = total - index - 1;
  if (remaining === 0) return "마지막 선택이에요";
  if (remaining <= 4) return `이제 ${remaining}번만 더 고르면 돼요`;
  if (index + 1 === Math.ceil(total / 2))
    return "서로 통할지 슬슬 궁금해지네요";
  return "둘 중 하나만 고르면 돼요";
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
  const url = `${window.location.origin}/assessments/together/balance-game?pack=${encodeURIComponent(
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
