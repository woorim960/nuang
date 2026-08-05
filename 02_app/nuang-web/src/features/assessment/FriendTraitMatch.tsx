"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AssessmentChoiceResponseOptions,
  AssessmentQuestionPrompt,
} from "@/features/assessment/AssessmentQuestionControls";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import {
  createFriendTraitMatchInviteUrl,
  type FriendTraitMatchChoiceId,
  type FriendTraitMatchInviteState,
} from "@/features/assessment/friend-trait-match-invite";
import styles from "@/features/assessment/FriendTraitMatch.module.css";
import {
  defaultFriendTraitMatchContent,
  type FriendTraitMatchContent,
} from "@/features/assessment/friend-trait-match-content";

type ChoiceId = FriendTraitMatchChoiceId;

export function FriendTraitMatch({
  content = defaultFriendTraitMatchContent,
  inviteState = { status: "sender" },
  previewMode = false,
  releaseId,
  slug = "friend-match",
}: {
  content?: FriendTraitMatchContent;
  inviteState?: FriendTraitMatchInviteState;
  previewMode?: boolean;
  releaseId?: string | null;
  slug?: string;
}) {
  if (inviteState.status === "invalid" || inviteState.status === "expired") {
    return (
      <InviteError content={content} slug={slug} state={inviteState.status} />
    );
  }

  if (inviteState.status === "ready") {
    return (
      <InviteReceiver content={content} invite={inviteState} slug={slug} />
    );
  }

  return (
    <InviteSender
      content={content}
      previewMode={previewMode}
      releaseId={releaseId}
      slug={slug}
    />
  );
}

function InviteSender({
  content,
  previewMode,
  releaseId,
  slug,
}: {
  content: FriendTraitMatchContent;
  previewMode: boolean;
  releaseId?: string | null;
  slug: string;
}) {
  const [step, setStep] = useState(0);
  const [myChoice, setMyChoice] = useState<ChoiceId | null>(null);
  const [predictedChoice, setPredictedChoice] = useState<ChoiceId | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const selectedChoice = step === 0 ? myChoice : predictedChoice;

  return (
    <CommunityScreenShell
      backHref="/home?view=together"
      backLabel="검사로 돌아가기"
      title={content.title}
    >
      <main className={styles.body}>
        <div aria-label={`${step + 1}/3 단계`} className={styles.progress}>
          {[0, 1, 2].map((index) => (
            <span data-active={index <= step ? "true" : "false"} key={index} />
          ))}
        </div>

        {step < 2 ? (
          <>
            <section className={styles.stepCopy}>
              <small>
                {step === 0 ? "먼저 내 선택" : "이제 친구의 선택 예상"}
              </small>
              <h2>
                {step === 0 ? content.senderHeading : content.predictionHeading}
              </h2>
            </section>

            <AssessmentQuestionPrompt
              contextLabel={content.contextLabel}
              headingLevel={2}
              key={`friend-match-${step}`}
              text={content.question}
            />
            <AssessmentChoiceResponseOptions
              choices={content.choices}
              legend={step === 0 ? "내 선택은?" : "친구라면?"}
              name={`friend-match-${step}`}
              onChange={(choiceId) => {
                if (step === 0) setMyChoice(choiceId as ChoiceId);
                else setPredictedChoice(choiceId as ChoiceId);
              }}
              selectedId={selectedChoice ?? undefined}
            />
          </>
        ) : (
          <>
            <section className={styles.stepCopy}>
              <small>초대할 준비 완료</small>
              <h2>이제 친구의 실제 선택을 확인해 보세요</h2>
            </section>

            <div className={styles.summary}>
              <article>
                <small>나의 선택</small>
                <strong>{getChoiceLabel(myChoice, content)}</strong>
              </article>
              <article>
                <small>내가 예상한 친구의 선택</small>
                <strong>{getChoiceLabel(predictedChoice, content)}</strong>
              </article>
            </div>
            <p className={styles.inviteNote}>
              초대 링크는 만든 날부터 14일 동안 열 수 있어요.
            </p>
            {shareStatus ? (
              <p className={styles.status} role="status">
                {shareStatus}
              </p>
            ) : null}
          </>
        )}

        <footer className={styles.footer}>
          {step > 0 ? (
            <button
              onClick={() => setStep((current) => current - 1)}
              type="button"
            >
              이전
            </button>
          ) : null}
          {step < 2 ? (
            <button
              disabled={!selectedChoice}
              onClick={() => setStep((current) => current + 1)}
              type="button"
            >
              다음
            </button>
          ) : (
            <button onClick={createInviteLink} type="button">
              친구에게 초대 보내기
            </button>
          )}
        </footer>
      </main>
    </CommunityScreenShell>
  );

  async function createInviteLink() {
    if (!myChoice || !predictedChoice) return;
    if (previewMode) {
      setShareStatus("미리보기에서는 초대 링크를 만들지 않아요.");
      return;
    }

    const inviteUrl = createFriendTraitMatchInviteUrl({
      guess: predictedChoice,
      mine: myChoice,
      origin: window.location.origin,
      releaseId,
      slug,
    });

    if (window.navigator.share) {
      try {
        await window.navigator.share({
          text: content.invitationText,
          title: content.invitationTitle,
          url: inviteUrl,
        });
        setShareStatus("초대 화면을 열었어요.");
        return;
      } catch {
        setShareStatus("공유를 취소했어요. 다시 눌러 초대할 수 있어요.");
        return;
      }
    }

    try {
      if (!window.navigator.clipboard?.writeText) throw new Error();
      await window.navigator.clipboard.writeText(inviteUrl);
      setShareStatus("초대 링크를 복사했어요.");
    } catch {
      setShareStatus("링크를 복사하지 못했어요. 다시 시도해 주세요.");
    }
  }
}

function InviteReceiver({
  content,
  invite,
  slug,
}: {
  content: FriendTraitMatchContent;
  invite: Extract<FriendTraitMatchInviteState, { status: "ready" }>;
  slug: string;
}) {
  const [actualChoice, setActualChoice] = useState<ChoiceId | null>(null);
  const [showResult, setShowResult] = useState(false);

  if (showResult && actualChoice) {
    const predictionMatched = invite.guess === actualChoice;
    const choicesMatched = invite.mine === actualChoice;
    const resultCopy = getResultCopy({
      choicesMatched,
      content,
      predictionMatched,
    });

    return (
      <CommunityScreenShell
        backHref="/home?view=together"
        backLabel="검사로 돌아가기"
        title={content.title}
      >
        <main className={styles.body}>
          <div aria-label="결과 확인 완료" className={styles.progress}>
            {[0, 1, 2].map((index) => (
              <span data-active="true" key={index} />
            ))}
          </div>

          <section className={styles.stepCopy}>
            <small>두 사람의 선택</small>
            <h2>{resultCopy.title}</h2>
            <p className={styles.resultLead}>{resultCopy.description}</p>
          </section>

          <div className={styles.resultSummary}>
            <ResultRow
              content={content}
              label="친구의 선택"
              value={invite.mine}
            />
            <ResultRow
              content={content}
              label="친구가 예상한 내 선택"
              value={invite.guess}
            />
            <ResultRow
              content={content}
              emphasis
              label="내 실제 선택"
              value={actualChoice}
            />
          </div>

          <section className={styles.resultInsight}>
            <strong>
              {predictionMatched ? "친구의 예상이 맞았어요" : "예상과 달랐어요"}
            </strong>
            <p>{content.resultInsight}</p>
          </section>

          <footer className={styles.footer}>
            <Link className={styles.footerAction} href={`/assessments/${slug}`}>
              나도 친구 성향 맞히기
            </Link>
          </footer>
        </main>
      </CommunityScreenShell>
    );
  }

  return (
    <CommunityScreenShell
      backHref="/home?view=together"
      backLabel="검사로 돌아가기"
      title={content.title}
    >
      <main className={styles.body}>
        <div aria-label="친구 답변 1/1 단계" className={styles.progress}>
          <span data-active="true" />
        </div>

        <section className={styles.stepCopy}>
          <small>친구가 내 선택을 예상했어요</small>
          <h2>{content.receiverHeading}</h2>
        </section>

        <AssessmentQuestionPrompt
          contextLabel={content.contextLabel}
          headingLevel={2}
          text={content.question}
        />
        <AssessmentChoiceResponseOptions
          choices={content.choices}
          legend="내 선택은?"
          name="friend-match-receiver"
          onChange={(choiceId) => setActualChoice(choiceId as ChoiceId)}
          selectedId={actualChoice ?? undefined}
        />

        <footer className={styles.footer}>
          <button
            disabled={!actualChoice}
            onClick={() => setShowResult(true)}
            type="button"
          >
            결과 보기
          </button>
        </footer>
      </main>
    </CommunityScreenShell>
  );
}

function InviteError({
  content,
  slug,
  state,
}: {
  content: FriendTraitMatchContent;
  slug: string;
  state: Extract<
    FriendTraitMatchInviteState,
    { status: "expired" | "invalid" }
  >["status"];
}) {
  const expired = state === "expired";

  return (
    <CommunityScreenShell
      backHref="/home?view=together"
      backLabel="검사로 돌아가기"
      title={content.title}
    >
      <main className={`${styles.body} ${styles.errorBody}`}>
        <section className={styles.errorState} role="alert">
          <span aria-hidden="true">N</span>
          <small>
            {expired ? "사용 기간이 지난 초대" : "확인할 수 없는 초대"}
          </small>
          <h2>
            {expired ? content.expiredInviteTitle : content.invalidInviteTitle}
          </h2>
          <p>
            {expired
              ? content.expiredInviteDescription
              : content.invalidInviteDescription}
          </p>
        </section>

        <footer className={styles.footer}>
          <Link className={styles.footerAction} href={`/assessments/${slug}`}>
            새 게임 시작하기
          </Link>
        </footer>
      </main>
    </CommunityScreenShell>
  );
}

function ResultRow({
  content,
  emphasis = false,
  label,
  value,
}: {
  content: FriendTraitMatchContent;
  emphasis?: boolean;
  label: string;
  value: ChoiceId;
}) {
  return (
    <article data-emphasis={emphasis ? "true" : "false"}>
      <small>{label}</small>
      <strong>{getChoiceLabel(value, content)}</strong>
    </article>
  );
}

function getResultCopy({
  choicesMatched,
  content,
  predictionMatched,
}: {
  choicesMatched: boolean;
  content: FriendTraitMatchContent;
  predictionMatched: boolean;
}) {
  if (predictionMatched && choicesMatched) {
    return content.resultCopies.bothMatched;
  }

  if (predictionMatched) {
    return content.resultCopies.predictionOnlyMatched;
  }

  if (choicesMatched) {
    return content.resultCopies.choiceOnlyMatched;
  }

  return content.resultCopies.bothDifferent;
}

function getChoiceLabel(
  choiceId: ChoiceId | null,
  content: FriendTraitMatchContent,
) {
  return (
    content.choices.find((choice) => choice.id === choiceId)?.label ?? "선택 전"
  );
}
