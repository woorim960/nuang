"use client";

import { Check, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import { CommunityTagInput } from "@/features/feed/CommunityTagInput";
import { FeedTopicSelector } from "@/features/feed/FeedTopicSelector";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import type { FeedQuestionAudience } from "@/features/feed/feed-seed";
import {
  maxFeedTagCount,
  normalizeFeedPostTopicCategory,
  type FeedPostTopicCategory,
} from "@/features/feed/feed-topic";
import {
  candidateAxisCopy,
  candidatePublicPairOrder,
  candidateRoleNames,
} from "@/features/nuang-code/candidate-profile-names";
import styles from "./CommunityQuestionComposer.module.css";

type AudienceMode = FeedQuestionAudience["mode"];

type QuestionEditValue = {
  audience: FeedQuestionAudience;
  body: string;
  category?: FeedPostTopicCategory | null;
  postId: string;
  replyCount: number;
  tags?: string[];
};

type PendingQuestionDraft = {
  audience: AudienceMode;
  category: FeedPostTopicCategory | null;
  exactCode: string;
  question: string;
  selectedTraits: string[];
  tags: string[];
};

const audienceOptions: Array<{
  description: string;
  label: string;
  value: "all" | "different" | "direct" | "similar";
}> = [
  {
    description: "모든 뉴앙 코드의 사람이 답할 수 있어요.",
    label: "모든 성향",
    value: "all",
  },
  {
    description: "내 코드와 공통점이 많은 사람에게 먼저 보여요.",
    label: "나와 비슷한 성향",
    value: "similar",
  },
  {
    description: "나와 다른 생각을 가진 사람에게 먼저 보여요.",
    label: "나와 다른 성향",
    value: "different",
  },
  {
    description: "원하는 한 자리 또는 5글자 뉴앙 코드를 정해요.",
    label: "직접 선택",
    value: "direct",
  },
];

const pendingQuestionKey = "nuang:feed:pending-question";

type ComposerStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "error" | "notice" };

export function CommunityQuestionComposer({
  initialValue,
  returnTo = "/feed",
}: {
  initialValue?: QuestionEditValue;
  returnTo?: string;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialValue);
  const [question, setQuestion] = useState(initialValue?.body ?? "");
  const [category, setCategory] = useState<FeedPostTopicCategory | null>(
    initialValue?.category ?? "concerns_questions",
  );
  const [audience, setAudience] = useState<AudienceMode>(
    initialValue?.audience.mode ?? "all",
  );
  const [selectedTraits, setSelectedTraits] = useState<string[]>(
    initialValue?.audience.mode === "trait"
      ? initialValue.audience.codes
      : [],
  );
  const [exactCode, setExactCode] = useState(
    initialValue?.audience.mode === "exact"
      ? (initialValue.audience.codes[0] ?? "")
      : "",
  );
  const [tags, setTags] = useState(initialValue?.tags ?? []);
  const [draftRestored, setDraftRestored] = useState(isEditing);
  const [status, setStatus] = useState<ComposerStatus>({ status: "idle" });
  const normalizedCode = exactCode.trim().toUpperCase();
  const exactProfileName = candidateRoleNames[normalizedCode] ?? null;
  const audienceReady =
    audience === "trait"
      ? selectedTraits.length > 0
      : audience === "exact"
        ? Boolean(exactProfileName)
        : true;
  const audienceLocked = Boolean(initialValue && initialValue.replyCount > 0);
  const audienceChoice =
    audience === "trait" || audience === "exact" ? "direct" : audience;
  const trimmedQuestion = question.trim();
  const canSubmit =
    trimmedQuestion.length >= 10 &&
    audienceReady &&
    status.status !== "pending";
  const questionHint = useMemo(() => {
    if (trimmedQuestion.length > 0 && trimmedQuestion.length < 10) {
      return "질문을 10자 이상 적어 주세요.";
    }
    return "상황을 함께 적으면 더 구체적인 답을 받을 수 있어요.";
  }, [trimmedQuestion.length]);

  useEffect(() => {
    if (isEditing) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      const draft = readPendingQuestionDraft();
      if (draft) {
        setQuestion(draft.question);
        setAudience(draft.audience);
        setCategory(draft.category);
        setSelectedTraits(draft.selectedTraits);
        setExactCode(draft.exactCode);
        setTags(draft.tags);
      }
      setDraftRestored(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || !draftRestored || typeof window === "undefined") return;
    window.sessionStorage.setItem(
      pendingQuestionKey,
      JSON.stringify({
        audience,
        category,
        exactCode,
        question,
        selectedTraits,
        tags,
      } satisfies PendingQuestionDraft),
    );
  }, [
    audience,
    category,
    draftRestored,
    exactCode,
    isEditing,
    question,
    selectedTraits,
    tags,
  ]);

  return (
    <CommunityScreenShell
      backHref={returnTo}
      backLabel="이전 화면으로 돌아가기"
      title={isEditing ? "질문 수정" : "뉴앙에게 물어봐"}
    >
      <div className={styles.composer}>
        <section className={styles.questionSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>질문</span>
              <h2>무엇이 궁금한가요?</h2>
            </div>
            <small>{question.length}/300</small>
          </div>
          <textarea
            aria-describedby="community-question-hint"
            aria-label="질문 내용"
            autoFocus
            maxLength={300}
            onChange={(event) => {
              setQuestion(event.target.value);
              if (status.status === "error") setStatus({ status: "idle" });
            }}
            placeholder="예: 서운한 일이 생기면 바로 이야기하는 편인가요?"
            value={question}
          />
          <p id="community-question-hint">{questionHint}</p>
        </section>

        <section className={styles.audienceSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>답변 대상</span>
              <h2>누구에게 물어볼까요?</h2>
            </div>
          </div>
          <div
            aria-label="답변을 받고 싶은 성향"
            className={styles.audienceList}
            role="radiogroup"
          >
            {audienceOptions.map((option) => {
              const selected = audienceChoice === option.value;
              return (
                <button
                  aria-checked={selected}
                  className={styles.audienceOption}
                  disabled={audienceLocked}
                  key={option.value}
                  onClick={() => {
                    setAudience(
                      option.value === "direct" ? "trait" : option.value,
                    );
                    setStatus({ status: "idle" });
                  }}
                  role="radio"
                  type="button"
                >
                  <span aria-hidden="true" className={styles.audienceIcon}>
                    {selected ? (
                      <Check size={15} strokeWidth={2.4} />
                    ) : (
                      <Users size={15} strokeWidth={1.7} />
                    )}
                  </span>
                  <span className={styles.audienceText}>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
          {audienceLocked ? (
            <p className={styles.lockedMessage}>
              답변이 시작되어 질문 대상은 바꿀 수 없어요.
            </p>
          ) : null}
        </section>

        {audienceChoice === "direct" ? (
          <section className={styles.detailSection}>
            <div
              aria-label="직접 선택 방법"
              className={styles.directTabs}
              role="tablist"
            >
              <button
                aria-selected={audience === "trait"}
                disabled={audienceLocked}
                onClick={() => setAudience("trait")}
                role="tab"
                type="button"
              >
                한 자리 뉴앙 코드
              </button>
              <button
                aria-selected={audience === "exact"}
                disabled={audienceLocked}
                onClick={() => setAudience("exact")}
                role="tab"
                type="button"
              >
                5글자 뉴앙 코드
              </button>
            </div>
            {audience === "trait" ? (
              <>
                <div className={styles.detailHeading}>
                  <strong>궁금한 뉴앙 코드를 골라 주세요</strong>
                  <span>{selectedTraits.length}/3</span>
                </div>
                <div className={styles.traitGroups}>
                  {candidatePublicPairOrder.map((pair, index) => (
                    <div className={styles.traitGroup} key={pair.join("")}>
                      <span>{candidateAxisCopy[index]?.label}</span>
                      <div>
                        {pair.map((symbol) => {
                          const direction =
                            candidateAxisCopy[index]?.directions[symbol];
                          return (
                            <button
                              aria-pressed={selectedTraits.includes(symbol)}
                              disabled={audienceLocked}
                              key={symbol}
                              onClick={() => toggleTrait(symbol)}
                              type="button"
                            >
                              <strong>{symbol}</strong>
                              <small>{direction?.publicTypeName}</small>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label className={styles.codeField}>
                  <span>5글자 뉴앙 코드</span>
                  <input
                    aria-label="답변을 받고 싶은 5글자 뉴앙 코드"
                    autoCapitalize="characters"
                    disabled={audienceLocked}
                    maxLength={5}
                    onChange={(event) => {
                      setExactCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z]/g, ""),
                      );
                      setStatus({ status: "idle" });
                    }}
                    placeholder="ENAKQ"
                    value={exactCode}
                  />
                </label>
                {exactProfileName ? (
                  <p className={styles.validCode}>
                    <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                    {normalizedCode} · {exactProfileName}
                  </p>
                ) : exactCode.length === 5 ? (
                  <p className={styles.invalidCode}>
                    올바른 5글자 뉴앙 코드를 입력해 주세요.
                  </p>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        <FeedTopicSelector
          onChange={setCategory}
          selectedCategory={category}
        />

        <CommunityTagInput
          onChange={(nextTags) => {
            setTags(nextTags);
            setStatus({ status: "idle" });
          }}
          onLimitReached={() =>
            setStatus({
              message: `태그는 최대 ${maxFeedTagCount}개까지 추가할 수 있어요.`,
              status: "notice",
            })
          }
          tags={tags}
        />

        {status.status === "error" || status.status === "notice" ? (
          <p
            aria-live="polite"
            className={styles.status}
            data-error={status.status === "error" ? "true" : "false"}
            role={status.status === "error" ? "alert" : "status"}
          >
            {status.message}
          </p>
        ) : null}

        <footer className={styles.stickyAction}>
          <button
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {status.status === "pending"
              ? isEditing
                ? "저장하는 중…"
                : "등록하는 중…"
              : isEditing
                ? "변경 내용 저장"
                : "질문 등록"}
          </button>
        </footer>
      </div>
    </CommunityScreenShell>
  );

  function toggleTrait(symbol: string) {
    setSelectedTraits((current) => {
      if (current.includes(symbol)) {
        return current.filter((item) => item !== symbol);
      }
      if (current.length >= 3) {
        setStatus({
          message: "뉴앙 코드는 최대 3개까지 고를 수 있어요.",
          status: "notice",
        });
        return current;
      }
      setStatus({ status: "idle" });
      return [...current, symbol];
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setStatus({ status: "pending" });
    const sourceId = createAudienceSourceId({
      audience,
      exactCode: normalizedCode,
      traits: selectedTraits,
    });
    const request: FeedWriteRequest = initialValue
      ? {
          action: "update_post",
          body: trimmedQuestion,
          postId: initialValue.postId,
          sourceId,
          topic: {
            category,
            source: "manual",
            tags,
          },
          visibility: "public",
        }
      : {
          action: "create_post",
          body: trimmedQuestion,
          source: "free_text",
          sourceId,
          topic: {
            category,
            source: "manual",
            tags,
          },
          visibility: "public",
        };

    try {
      const response = await fetch("/api/feed", {
        body: JSON.stringify(request),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        feedWrite?: { id?: string; moderationStatus?: string | null };
        message?: string;
      } | null;

      if (response.status === 401) {
        const next = isEditing
          ? `/feed/questions/${initialValue?.postId}/edit`
          : "/feed/questions/new";
        router.push(
          `/login?next=${encodeURIComponent(next)}&reason=community`,
        );
        return;
      }

      if (!response.ok || !payload?.feedWrite?.id) {
        setStatus({
          message:
            payload?.message ??
            (isEditing
              ? "수정 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
              : "질문을 등록하지 못했어요. 잠시 후 다시 시도해 주세요."),
          status: "error",
        });
        return;
      }

      if (!isEditing) {
        window.sessionStorage.removeItem(pendingQuestionKey);
      }
      router.push(
        isEditing
          ? returnTo
          : payload.feedWrite.moderationStatus === "pending_review"
            ? "/feed?review=pending"
            : `/feed?posted=${encodeURIComponent(payload.feedWrite.id)}`,
      );
      router.refresh();
    } catch {
      setStatus({
        message: "연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
        status: "error",
      });
    }
  }
}

function readPendingQuestionDraft(): PendingQuestionDraft | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(pendingQuestionKey);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<PendingQuestionDraft>;
    const audienceModes: AudienceMode[] = [
      "all",
      "different",
      "exact",
      "similar",
      "trait",
    ];
    return {
      audience: audienceModes.includes(parsed.audience as AudienceMode)
        ? (parsed.audience as AudienceMode)
        : "all",
      category:
        normalizeFeedPostTopicCategory(parsed.category) ??
        "concerns_questions",
      exactCode:
        typeof parsed.exactCode === "string" ? parsed.exactCode : "",
      question:
        typeof parsed.question === "string" ? parsed.question : "",
      selectedTraits: Array.isArray(parsed.selectedTraits)
        ? parsed.selectedTraits.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    };
  } catch {
    return {
      audience: "all",
      category: "concerns_questions",
      exactCode: "",
      question: stored,
      selectedTraits: [],
      tags: [],
    };
  }
}

function createAudienceSourceId({
  audience,
  exactCode,
  traits,
}: {
  audience: AudienceMode;
  exactCode: string;
  traits: string[];
}) {
  if (audience === "exact") return `ask_exact_${exactCode.toLowerCase()}`;
  if (audience === "trait") {
    return `ask_trait_${traits.join("_").toLowerCase()}`;
  }
  return `ask_${audience}`;
}
