"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "@/features/together-balance/constants";
import {
  BalanceApiClientError,
  createBalanceRoom,
} from "@/features/together-balance/client";
import type {
  BalancePack,
  BalanceQuestionCount,
} from "@/features/together-balance/types";
import styles from "./BalanceGameSetup.module.css";

export function BalanceGameSetup({ pack }: { pack: BalancePack }) {
  const router = useRouter();
  const [hostNickname, setHostNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [targetParticipantCount, setTargetParticipantCount] = useState(2);
  const [questionCount, setQuestionCount] = useState<BalanceQuestionCount>(
    pack.defaultQuestionCount,
  );
  const [participationMode, setParticipationMode] = useState<
    "private_group" | "feed_group"
  >("private_group");
  const [status, setStatus] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const createRequestRef = useRef<{ configKey: string; id: string } | null>(
    null,
  );

  useEffect(() => {
    const draft = readRoomCreationDraft(pack.slug);
    if (!draft) return;
    const restoreTimer = window.setTimeout(() => {
      setHostNickname(draft.hostNickname);
      setRoomName(draft.roomName);
      setTargetParticipantCount(draft.targetParticipantCount);
      setQuestionCount(draft.questionCount);
      setParticipationMode(draft.participationMode);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [pack.slug]);

  const selectedMinutes = getEstimatedMinutes(questionCount);
  const lengthOptions = getLengthOptions(pack).map((option, index) => ({
    ...option,
    tone: getLengthTone(index),
  }));
  const selectedLengthTone =
    lengthOptions.find((option) => option.count === questionCount)?.tone ??
    "balanced";

  return (
    <CommunityScreenShell
      backHref="/assessments/together/balance-game"
      backLabel="주제 목록으로 돌아가기"
      title="방 설정"
    >
      <form className={styles.page} onSubmit={handleSubmit}>
        <section className={styles.intro}>
          <small>선택한 주제</small>
          <h2>{pack.title}</h2>
          <p>{pack.description}</p>
        </section>

        <div className={styles.formBody}>
          <section className={styles.setupSection}>
            <header>
              <div>
                <h3>
                  방 이름 <em>선택</em>
                </h3>
                <p>비워두면 닉네임으로 자동 생성해요.</p>
              </div>
            </header>
            <label className={styles.textField}>
              <span className={styles.visuallyHidden}>방 이름</span>
              <input
                maxLength={32}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="예: 우리의 취향 대결"
                value={roomName}
              />
            </label>
          </section>

          <section className={styles.setupSection}>
            <header>
              <div>
                <h3>방장 닉네임</h3>
                <p>닉네임은 이 방의 참여자에게만 보여요.</p>
              </div>
            </header>
            <label className={styles.textField}>
              <span className={styles.visuallyHidden}>방장 닉네임</span>
              <input
                autoComplete="nickname"
                maxLength={16}
                onChange={(event) => {
                  setHostNickname(event.target.value);
                  setStatus("");
                }}
                placeholder="예: 민지"
                required
                value={hostNickname}
              />
            </label>
          </section>

          <fieldset className={styles.setupSection}>
            <legend>
              <span>
                <strong>함께할 인원</strong>
                <small>방장 포함 2~8명</small>
              </span>
            </legend>
            <div className={styles.participantStepper}>
              <button
                aria-label="인원 한 명 줄이기"
                disabled={targetParticipantCount === 2}
                onClick={() =>
                  setTargetParticipantCount((count) => Math.max(2, count - 1))
                }
                type="button"
              >
                −
              </button>
              <output aria-live="polite">
                <strong>{targetParticipantCount}</strong>
                <span>명</span>
              </output>
              <button
                aria-label="인원 한 명 늘리기"
                disabled={targetParticipantCount === 8}
                onClick={() =>
                  setTargetParticipantCount((count) => Math.min(8, count + 1))
                }
                type="button"
              >
                +
              </button>
            </div>
          </fieldset>

          <fieldset className={styles.setupSection}>
            <legend>
              <span>
                <strong>문항 수</strong>
                <small>가볍게 시작하거나 충분히 비교해 보세요.</small>
              </span>
            </legend>
            <div
              className={styles.lengthOptions}
              data-tone={selectedLengthTone}
            >
              {lengthOptions.map((option) => (
                <button
                  aria-pressed={questionCount === option.count}
                  key={option.count}
                  onClick={() => setQuestionCount(option.count)}
                  type="button"
                >
                  <strong>{option.label}</strong>
                </button>
              ))}
            </div>
            <p
              className={styles.selectionSummary}
              data-tone={selectedLengthTone}
              aria-live="polite"
            >
              {questionCount}문항 · 약 {selectedMinutes}분
            </p>
          </fieldset>

          <fieldset className={styles.setupSection}>
            <legend>
              <span>
                <strong>참여 방식</strong>
                <small>링크로 초대하거나 피드에서 함께할 사람을 찾아요.</small>
              </span>
            </legend>
            <div className={styles.modeOptions}>
              <button
                aria-pressed={participationMode === "private_group"}
                onClick={() => {
                  setParticipationMode("private_group");
                  setRequiresLogin(false);
                  setStatus("");
                }}
                type="button"
              >
                <span>
                  <strong>초대한 사람끼리</strong>
                  <small>링크나 코드를 받은 사람만 참여</small>
                </span>
                <i aria-hidden="true" />
              </button>
              <button
                aria-pressed={participationMode === "feed_group"}
                onClick={() => {
                  setParticipationMode("feed_group");
                  setRequiresLogin(false);
                  setStatus("");
                }}
                type="button"
              >
                <span>
                  <strong>피드에서 함께 찾기</strong>
                  <small>로그인 후 빈자리를 공개 모집</small>
                </span>
                <i aria-hidden="true" />
              </button>
            </div>
          </fieldset>

          <p className={styles.privacyNote}>
            결과가 열리면 이 방의 참여자끼리 닉네임과 문항별 선택을 볼 수
            있어요.
          </p>

          {status || requiresLogin ? (
            <div className={styles.formStatus} role="alert">
              {status ? <p>{status}</p> : null}
              {requiresLogin ? (
                <Link
                  href={`/login?next=${encodeURIComponent(
                    `/assessments/together/balance-game/setup?pack=${pack.slug}`,
                  )}&reason=community`}
                >
                  로그인하고 이 설정으로 돌아오기
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className={styles.actionBar}>
          <p>
            {targetParticipantCount}명 · {questionCount}문항 · 약 {selectedMinutes}분
          </p>
          <button disabled={!hostNickname.trim() || submitting} type="submit">
            {submitting ? "방을 준비하는 중…" : "방 만들기"}
          </button>
        </footer>
      </form>
    </CommunityScreenShell>
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hostNickname.trim() || submitting) return;

    setSubmitting(true);
    setStatus("");
    setRequiresLogin(false);
    const configKey = JSON.stringify({
      hostNickname: hostNickname.trim(),
      packSlug: pack.slug,
      participationMode,
      questionCount,
      roomName: roomName.trim(),
      targetParticipantCount,
    });
    if (createRequestRef.current?.configKey !== configKey) {
      createRequestRef.current = {
        configKey,
        id: createClientRequestId(),
      };
    }

    try {
      const result = await createBalanceRoom({
        answerRevealConsentVersion: BALANCE_ANSWER_REVEAL_CONSENT_VERSION,
        clientRequestId: createRequestRef.current.id,
        hostNickname: hostNickname.trim(),
        packSlug: pack.slug,
        participationMode,
        questionCount,
        roomName: roomName.trim() || `${hostNickname.trim()}의 취향 대결`,
        targetParticipantCount,
      });
      clearRoomCreationDraft(pack.slug);
      router.push(
        `/assessments/together/balance-game/rooms/${result.room.roomCode}`,
      );
    } catch (error) {
      if (
        error instanceof BalanceApiClientError &&
        error.code === "feed_auth_required"
      ) {
        writeRoomCreationDraft({
          hostNickname: hostNickname.trim(),
          packSlug: pack.slug,
          participationMode,
          questionCount,
          roomName: roomName.trim(),
          targetParticipantCount,
        });
        setRequiresLogin(true);
      }
      setStatus(
        error instanceof Error
          ? error.message
          : "방을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  }
}

type RoomCreationDraft = {
  hostNickname: string;
  packSlug: string;
  participationMode: "private_group" | "feed_group";
  questionCount: BalanceQuestionCount;
  roomName: string;
  targetParticipantCount: number;
};

const roomCreationDraftStorageKey = "nuang.together-balance.room-draft.v1";

function readRoomCreationDraft(packSlug: string): RoomCreationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(roomCreationDraftStorageKey) ?? "null",
    ) as RoomCreationDraft | null;
    return parsed?.packSlug === packSlug ? parsed : null;
  } catch {
    return null;
  }
}

function writeRoomCreationDraft(draft: RoomCreationDraft) {
  try {
    window.sessionStorage.setItem(
      roomCreationDraftStorageKey,
      JSON.stringify(draft),
    );
  } catch {
    // The login recovery link still works when session storage is unavailable.
  }
}

function clearRoomCreationDraft(packSlug: string) {
  if (readRoomCreationDraft(packSlug)) {
    window.sessionStorage.removeItem(roomCreationDraftStorageKey);
  }
}

function getLengthOptions(pack: BalancePack) {
  const counts = Array.from(
    new Set<BalanceQuestionCount>([8, pack.defaultQuestionCount, 24]),
  );
  return counts.map((count) => ({
    count,
    label:
      count === 8
        ? "가볍게"
        : count === pack.defaultQuestionCount
          ? "딱 좋게"
          : "깊게",
  }));
}

function getLengthTone(index: number): "quick" | "balanced" | "deep" {
  if (index === 0) return "quick";
  if (index === 1) return "balanced";
  return "deep";
}

function getEstimatedMinutes(questionCount: number) {
  if (questionCount <= 8) return 1;
  if (questionCount <= 16) return 2;
  if (questionCount <= 20) return 3;
  return 4;
}

function createClientRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `balance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
