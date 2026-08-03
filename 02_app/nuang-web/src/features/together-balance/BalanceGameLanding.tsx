"use client";

import { Check, ChevronRight, Link2, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import { BALANCE_ANSWER_REVEAL_CONSENT_VERSION } from "@/features/together-balance/api-contract";
import {
  BalanceApiClientError,
  createBalanceRoom,
} from "@/features/together-balance/client";
import { PUBLIC_BALANCE_PACKS } from "@/features/together-balance/content";
import type {
  BalancePack,
  BalanceQuestionCount,
} from "@/features/together-balance/types";
import styles from "./BalanceGameLanding.module.css";

const packShelfBySlug: Record<
  string,
  "popular" | "taste" | "relationship" | "fun"
> = {
  "forever-one": "fun",
  "funny-extreme": "fun",
  "ideal-person": "relationship",
  "mixed-taste": "popular",
  "what-to-do": "taste",
  "what-to-eat": "popular",
  "what-to-watch": "taste",
  "where-to-go": "popular",
};

const shelfOptions = [
  { id: "all", label: "전체" },
  { id: "popular", label: "지금 많이 하는" },
  { id: "taste", label: "우리 취향" },
  { id: "relationship", label: "관계 케미" },
  { id: "fun", label: "웃긴 선택" },
] as const;

type ShelfId = (typeof shelfOptions)[number]["id"];

export function BalanceGameLanding({
  initialPackSlug,
}: {
  initialPackSlug?: string;
}) {
  const [activeShelf, setActiveShelf] = useState<ShelfId>("all");
  const [selectedPack, setSelectedPack] = useState<BalancePack | null>(
    () =>
      PUBLIC_BALANCE_PACKS.find((pack) => pack.slug === initialPackSlug) ??
      null,
  );
  const shownPacks = useMemo(
    () =>
      activeShelf === "all"
        ? PUBLIC_BALANCE_PACKS
        : PUBLIC_BALANCE_PACKS.filter(
          (pack) => packShelfBySlug[pack.slug] === activeShelf,
        ),
    [activeShelf],
  );

  return (
    <CommunityScreenShell
      backHref="/home?view=together"
      backLabel="검사로 돌아가기"
      title="밸런스 게임"
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <p>2~8명이 함께</p>
          <h2>우리, 얼마나 비슷하게 고를까?</h2>
          <span>
            간단한 게임을 통해 서로의 궁합을 확인할 수 있어요!
          </span>
          <div className={styles.heroPair} aria-hidden="true">
            <span>산</span>
            <b>VS</b>
            <span>바다</span>
          </div>
        </section>

        <JoinByCode />

        <section className={styles.catalog}>
          <header>
            <div>
              <small>{getShelfEyebrow(activeShelf)}</small>
              <h2>{getShelfTitle(activeShelf)}</h2>
            </div>
            <span>{shownPacks.length}개 주제</span>
          </header>

          <nav aria-label="주제팩 분류" className={styles.shelves}>
            {shelfOptions.map((shelf) => (
              <button
                aria-pressed={activeShelf === shelf.id}
                key={shelf.id}
                onClick={() => setActiveShelf(shelf.id)}
                type="button"
              >
                {shelf.label}
              </button>
            ))}
          </nav>

          <div className={styles.packList}>
            {shownPacks.map((pack) => (
              <PackCard
                key={pack.id}
                onSelect={() => setSelectedPack(pack)}
                pack={pack}
              />
            ))}
          </div>
        </section>

        <details className={styles.howItWorks}>
          <summary>
            <span>함께하는 방법</span>
            <small>방 만들기부터 결과까지</small>
          </summary>
          <ol>
            <li>
              <b>1</b>
              <span>
                <strong>방을 만들고 초대해요</strong>
                <em>인원은 방장 포함 2~8명</em>
              </span>
            </li>
            <li>
              <b>2</b>
              <span>
                <strong>둘 중 더 끌리는 쪽을 골라요</strong>
                <em>선택은 결과가 열릴 때까지 비공개</em>
              </span>
            </li>
            <li>
              <b>3</b>
              <span>
                <strong>둘과 그룹의 취향 궁합을 봐요</strong>
                <em>두 명만 완료해도 현재 결과 공개</em>
              </span>
            </li>
          </ol>
        </details>
      </div>

      {selectedPack ? (
        <RoomCreationSheet
          onClose={() => setSelectedPack(null)}
          pack={selectedPack}
        />
      ) : null}
    </CommunityScreenShell>
  );
}

function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className={styles.codeJoin}
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length !== 6) return;
        router.push(
          `/assessments/together/balance-game/rooms/${encodeURIComponent(code)}`,
        );
      }}
    >
      <label htmlFor="balance-room-code">참여 코드가 있나요?</label>
      <div>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          id="balance-room-code"
          inputMode="text"
          maxLength={6}
          onChange={(event) =>
            setCode(
              event.target.value
                .toUpperCase()
                .replace(/[^2-9A-HJ-NP-Z]/g, "")
                .slice(0, 6),
            )
          }
          placeholder="6자리 코드"
          spellCheck={false}
          value={code}
        />
        <button disabled={code.length !== 6} type="submit">
          입장
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </form>
  );
}

function PackCard({
  onSelect,
  pack,
}: {
  onSelect: () => void;
  pack: BalancePack;
}) {
  const sample = pack.questions[0];
  const tone = getPackTone(pack.slug);

  return (
    <button
      className={styles.packCard}
      data-tone={tone}
      onClick={onSelect}
      type="button"
    >
      <span className={styles.packTopline}>
        <small>{getTemplateLabel(pack)}</small>
        <em>
          {pack.defaultQuestionCount}문항 · 약{" "}
          {getEstimatedMinutes(pack.defaultQuestionCount)}분
        </em>
      </span>
      <strong>{pack.title}</strong>
      <p>{pack.description}</p>
      <span className={styles.samplePair}>
        <span>{sample.options[0].text}</span>
        <b>VS</b>
        <span>{sample.options[1].text}</span>
      </span>
      <span className={styles.packFooter}>
        <em>전체 {pack.questions.length}개 질문</em>
        <span>
          이 주제로 시작
          <ChevronRight aria-hidden="true" size={17} strokeWidth={1.8} />
        </span>
      </span>
    </button>
  );
}

function RoomCreationSheet({
  onClose,
  pack,
}: {
  onClose: () => void;
  pack: BalancePack;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLFormElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
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
    const restoreTimer = window.setTimeout(() => {
      const draft = readRoomCreationDraft(pack.slug);
      if (!draft) return;
      setHostNickname(draft.hostNickname);
      setRoomName(draft.roomName);
      setTargetParticipantCount(draft.targetParticipantCount);
      setQuestionCount(draft.questionCount);
      setParticipationMode(draft.participationMode);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [pack.slug]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const activeDialog = dialog;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overlay = dialog.parentElement;
    const backgroundSiblings = overlay?.parentElement
      ? Array.from(overlay.parentElement.children).filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element !== overlay,
      )
      : [];
    const previousOverflow = document.body.style.overflow;
    const previousInert = backgroundSiblings.map((element) =>
      element.hasAttribute("inert"),
    );

    document.body.style.overflow = "hidden";
    backgroundSiblings.forEach((element) => element.setAttribute("inert", ""));
    const usesTouchPointer =
      window.matchMedia?.("(pointer: coarse)").matches ?? false;
    if (usesTouchPointer) {
      activeDialog.focus();
    } else {
      initialFocusRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        activeDialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      backgroundSiblings.forEach((element, index) => {
        if (!previousInert[index]) element.removeAttribute("inert");
      });
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.sheetBackdrop}>
      <button
        aria-label="방 만들기 닫기"
        className={styles.backdropDismiss}
        onClick={onClose}
        type="button"
      />
      <form
        aria-label={`${pack.title} 방 만들기`}
        aria-modal="true"
        className={styles.sheet}
        onSubmit={handleSubmit}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <span aria-hidden="true" className={styles.sheetHandle} />
        <header className={styles.sheetHeader}>
          <div>
            <small>선택한 주제</small>
            <h2>{pack.title}</h2>
          </div>
          <button aria-label="닫기" onClick={onClose} type="button">
            <X aria-hidden="true" size={22} />
          </button>
        </header>

        <div className={styles.sheetScroll}>
          <label className={styles.textField}>
            <span>방장 닉네임</span>
            <input
              maxLength={16}
              onChange={(event) => setHostNickname(event.target.value)}
              placeholder="방에서 사용할 이름"
              ref={initialFocusRef}
              required
              value={hostNickname}
            />
            <small>이 방 안에서만 보여요.</small>
          </label>

          <fieldset className={styles.choiceField}>
            <legend>몇 명이 함께하나요?</legend>
            <p>방장님을 포함한 인원이에요.</p>
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

          <fieldset className={styles.choiceField}>
            <legend>얼마나 해볼까요?</legend>
            <div className={styles.lengthOptions}>
              {getLengthOptions(pack).map((option) => (
                <button
                  aria-pressed={questionCount === option.count}
                  key={option.count}
                  onClick={() => setQuestionCount(option.count)}
                  type="button"
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>
                      {option.count}문항 · 약{" "}
                      {getEstimatedMinutes(option.count)}분
                    </small>
                  </span>
                  {questionCount === option.count ? (
                    <Check aria-hidden="true" size={18} />
                  ) : null}
                </button>
              ))}
            </div>
            <p>새 방을 만들면 최근에 본 문항은 가능한 한 피해서 보여줘요.</p>
          </fieldset>

          <fieldset className={styles.choiceField}>
            <legend>어떻게 함께할까요?</legend>
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
                <Link2 aria-hidden="true" size={20} />
                <span>
                  <strong>친구에게 초대</strong>
                  <small>링크를 받은 사람만 참여</small>
                </span>
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
                <Users aria-hidden="true" size={20} />
                <span>
                  <strong>피드에서 모집</strong>
                  <small>로그인 후 빈자리를 공개 모집</small>
                </span>
              </button>
            </div>
          </fieldset>

          <label className={`${styles.textField} ${styles.optionalField}`}>
            <span>
              방 이름 <em>선택</em>
            </span>
            <input
              maxLength={32}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder={
                hostNickname.trim()
                  ? `${hostNickname.trim()}의 취향 대결`
                  : "우리의 취향 대결"
              }
              value={roomName}
            />
          </label>

          {status || requiresLogin ? (
            <div className={styles.formStatus} role="alert">
              {status ? <p>{status}</p> : null}
              {requiresLogin ? (
                <Link
                  href={`/login?next=${encodeURIComponent(
                    `/assessments/together/balance-game?pack=${pack.slug}`,
                  )}&reason=community`}
                >
                  로그인하고 이어서 만들기
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className={styles.sheetAction}>
          <p className={styles.revealConsent}>
            시작하면 결과가 열린 뒤 이 방 참여자끼리 닉네임과 문항별 선택을 볼
            수 있어요.
          </p>
          <button disabled={!hostNickname.trim() || submitting} type="submit">
            {submitting
              ? "방을 만들고 있어요…"
              : participationMode === "feed_group"
                ? "피드 모집방 만들기"
                : "우리끼리 방 만들기"}
          </button>
        </footer>
      </form>
    </div>
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
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      roomCreationDraftStorageKey,
      JSON.stringify(draft),
    );
  } catch {
    // The form still exposes a login recovery link if storage is unavailable.
  }
}

function clearRoomCreationDraft(packSlug: string) {
  if (typeof window === "undefined") return;
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
        ? "빠르게"
        : count === pack.defaultQuestionCount
          ? "기본"
          : "길게",
  }));
}

function getEstimatedMinutes(questionCount: number) {
  if (questionCount <= 8) return 1;
  if (questionCount <= 16) return 2;
  if (questionCount <= 20) return 3;
  return 4;
}

function getTemplateLabel(pack: BalancePack) {
  if (pack.scoringTemplate === "ideal_preference") return "이상형 취향";
  if (pack.scoringTemplate === "dilemma_fun") return "선택 케미";
  return "취향 궁합";
}

function getPackTone(slug: string) {
  const tones: Record<string, string> = {
    "forever-one": "gold",
    "funny-extreme": "coral",
    "ideal-person": "rose",
    "mixed-taste": "violet",
    "what-to-do": "mint",
    "what-to-eat": "orange",
    "what-to-watch": "blue",
    "where-to-go": "green",
  };
  return tones[slug] ?? "violet";
}

function getShelfEyebrow(shelf: ShelfId) {
  if (shelf === "all") return "골라서 바로 시작";
  return shelfOptions.find((option) => option.id === shelf)?.label ?? "";
}

function getShelfTitle(shelf: ShelfId) {
  const titles: Record<ShelfId, string> = {
    all: "오늘은 어떤 걸 맞혀볼까요?",
    fun: "고른 이유까지 웃긴 질문",
    popular: "지금 같이 하기 좋은 주제",
    relationship: "서로의 마음을 더 알아가는 선택",
    taste: "실제로 같이 정하기 좋은 취향",
  };
  return titles[shelf];
}

function createClientRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `balance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
