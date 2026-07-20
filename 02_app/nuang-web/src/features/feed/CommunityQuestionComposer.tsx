"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import styles from "@/features/feed/CommunityFeatureScreens.module.css";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import {
  candidatePublicPairOrder,
  candidateRoleNames,
} from "@/features/nuang-code/candidate-profile-names";

type AudienceMode = "all" | "different" | "exact" | "similar" | "trait";

const audienceOptions: Array<{
  description: string;
  label: string;
  value: AudienceMode;
}> = [
  {
    description: "모든 성향의 다양한 답을 받아요.",
    label: "모두에게",
    value: "all",
  },
  {
    description: "나와 여러 자리가 가까운 사람에게 먼저 물어봐요.",
    label: "비슷한 성향",
    value: "similar",
  },
  {
    description: "나와 다른 관점을 가진 사람에게 먼저 물어봐요.",
    label: "다른 관점",
    value: "different",
  },
  {
    description: "E, N, A처럼 궁금한 한 자리 성향을 최대 3개 골라요.",
    label: "한 자리 성향",
    value: "trait",
  },
  {
    description: "딱 하나의 5자리 뉴앙 코드를 지정해 물어봐요.",
    label: "5자리 코드",
    value: "exact",
  },
];

const axisLabels = ["에너지", "관심", "관계", "일상", "반응"] as const;
const pendingQuestionKey = "nuang:feed:pending-question";

type ComposerStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "error" | "notice" };

export function CommunityQuestionComposer() {
  const router = useRouter();
  const [question, setQuestion] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem(pendingQuestionKey) ?? "";
  });
  const [audience, setAudience] = useState<AudienceMode>("all");
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [exactCode, setExactCode] = useState("");
  const [status, setStatus] = useState<ComposerStatus>({ status: "idle" });
  const normalizedCode = exactCode.trim().toUpperCase();
  const exactProfileName = candidateRoleNames[normalizedCode] ?? null;
  const currentAudience = useMemo(
    () => audienceOptions.find((option) => option.value === audience)!,
    [audience],
  );
  const audienceReady =
    audience === "trait"
      ? selectedTraits.length > 0
      : audience === "exact"
        ? Boolean(exactProfileName)
        : true;
  const canUpload =
    question.trim().length >= 10 &&
    audienceReady &&
    status.status !== "pending";

  return (
    <CommunityScreenShell title="뉴앙에게 물어봐">
      <div className={styles.featureBody} data-tone="conversation">
        <section className={styles.intro}>
          <span className={styles.eyebrow}>ASK NUANG</span>
          <h2>궁금한 성향에게 직접 물어보세요</h2>
          <p>
            답을 듣고 싶은 성향을 고르면 추천 피드에서 그 사람들에게 질문을 먼저
            보여줘요.
          </p>
        </section>

        <section className={styles.fieldSection}>
          <label className={styles.fieldLabel} htmlFor="community-question">
            질문
            <span aria-hidden="true">{question.length}/300</span>
          </label>
          <textarea
            aria-label="질문"
            className={styles.questionInput}
            id="community-question"
            maxLength={300}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="다른 성향의 생각이 궁금했던 순간을 적어보세요."
            value={question}
          />
        </section>

        <nav aria-label="답변을 받고 싶은 성향" className={styles.audienceTabs}>
          {audienceOptions.map((option) => (
            <button
              aria-pressed={audience === option.value}
              key={option.value}
              onClick={() => setAudience(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </nav>
        <p className={styles.audienceCopy}>{currentAudience.description}</p>

        {audience === "trait" ? (
          <div className={styles.traitGroups}>
            {candidatePublicPairOrder.map((pair, index) => (
              <div className={styles.traitGroup} key={pair.join("")}>
                <span>{axisLabels[index]}</span>
                {pair.map((symbol) => (
                  <button
                    aria-pressed={selectedTraits.includes(symbol)}
                    key={symbol}
                    onClick={() => toggleTrait(symbol)}
                    type="button"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        {audience === "exact" ? (
          <label className={styles.codeField}>
            <input
              aria-label="답변을 받고 싶은 5자리 뉴앙 코드"
              autoCapitalize="characters"
              maxLength={5}
              onChange={(event) =>
                setExactCode(
                  event.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                )
              }
              placeholder="예: ENAKQ"
              value={exactCode}
            />
            <small>
              {exactProfileName
                ? `${normalizedCode} · ${exactProfileName}에게 답변을 요청해요.`
                : "정확한 5자리 코드를 입력하면 성향 이름도 함께 확인할 수 있어요."}
            </small>
          </label>
        ) : null}

        {question.trim() ? (
          <section aria-label="질문 미리보기" className={styles.preview}>
            <span>피드에서 이렇게 보여요 · {getAudienceLabel()}</span>
            <p>{question.trim()}</p>
          </section>
        ) : null}

        {status.status === "error" || status.status === "notice" ? (
          <p
            className={styles.status}
            data-error={status.status === "error" ? "true" : "false"}
            role={status.status === "error" ? "alert" : "status"}
          >
            {status.message}
          </p>
        ) : null}

        <footer className={styles.stickyAction}>
          <button disabled={!canUpload} onClick={handleUpload} type="button">
            {status.status === "pending" ? "질문 업로드 중" : "질문 업로드"}
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
          message: "한 자리 성향은 최대 3개까지 고를 수 있어요.",
          status: "notice",
        });
        return current;
      }
      setStatus({ status: "idle" });
      return [...current, symbol];
    });
  }

  function getAudienceLabel() {
    if (audience === "trait")
      return selectedTraits.join(" · ") || "한 자리 성향";
    if (audience === "exact") return normalizedCode || "5자리 코드";
    return currentAudience.label;
  }

  async function handleUpload() {
    if (!canUpload) return;

    setStatus({ status: "pending" });
    const trimmedQuestion = question.trim();
    window.sessionStorage.setItem(pendingQuestionKey, trimmedQuestion);

    const request: FeedWriteRequest = {
      action: "create_post",
      body: trimmedQuestion,
      source: "free_text",
      sourceId: createAudienceSourceId({
        audience,
        exactCode: normalizedCode,
        traits: selectedTraits,
      }),
      topic: {
        category: "concerns_questions",
        source: "manual",
        tags: [],
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
        feedWrite?: { id?: string };
        message?: string;
      } | null;

      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent("/feed/questions/new")}&reason=community`,
        );
        return;
      }

      if (!response.ok || !payload?.feedWrite?.id) {
        setStatus({
          message:
            payload?.message ??
            "질문을 업로드하지 못했어요. 잠시 후 다시 시도해 주세요.",
          status: "error",
        });
        return;
      }

      window.sessionStorage.removeItem(pendingQuestionKey);
      router.push(`/feed?posted=${encodeURIComponent(payload.feedWrite.id)}`);
      router.refresh();
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 질문을 업로드하지 못했어요.",
        status: "error",
      });
    }
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
