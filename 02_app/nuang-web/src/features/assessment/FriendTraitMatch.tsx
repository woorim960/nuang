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

const choices = [
  {
    id: "plan",
    label: "바뀐 일정에 맞춰 새 계획부터 정하고 싶어요",
  },
  {
    id: "listen",
    label: "왜 바뀌었는지 친구의 상황부터 충분히 듣고 싶어요",
  },
] as const;

type ChoiceId = FriendTraitMatchChoiceId;

export function FriendTraitMatch({
  inviteState = { status: "sender" },
}: {
  inviteState?: FriendTraitMatchInviteState;
}) {
  if (inviteState.status === "invalid" || inviteState.status === "expired") {
    return <InviteError state={inviteState.status} />;
  }

  if (inviteState.status === "ready") {
    return <InviteReceiver invite={inviteState} />;
  }

  return <InviteSender />;
}

function InviteSender() {
  const [step, setStep] = useState(0);
  const [myChoice, setMyChoice] = useState<ChoiceId | null>(null);
  const [predictedChoice, setPredictedChoice] = useState<ChoiceId | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const selectedChoice = step === 0 ? myChoice : predictedChoice;

  return (
    <CommunityScreenShell
      backHref="/home?view=together"
      backLabel="검사로 돌아가기"
      title="친구 성향 맞히기"
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
                {step === 0
                  ? "같은 상황에서 나는 어떻게 반응할까요?"
                  : "친구라면 어떤 답을 고를까요?"}
              </h2>
            </section>

            <AssessmentQuestionPrompt
              contextLabel="친구와 약속한 날"
              headingLevel={2}
              key={`friend-match-${step}`}
              text="친구가 갑자기 일정을 바꾸자고 해요. 이때 나는?"
            />
            <AssessmentChoiceResponseOptions
              choices={choices}
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
                <strong>{getChoiceLabel(myChoice)}</strong>
              </article>
              <article>
                <small>내가 예상한 친구의 선택</small>
                <strong>{getChoiceLabel(predictedChoice)}</strong>
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

    const inviteUrl = createFriendTraitMatchInviteUrl({
      guess: predictedChoice,
      mine: myChoice,
      origin: window.location.origin,
    });

    if (window.navigator.share) {
      try {
        await window.navigator.share({
          text: "내가 예상한 너의 선택이 맞는지 확인해 줘!",
          title: "뉴앙 친구 성향 맞히기",
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
  invite,
}: {
  invite: Extract<FriendTraitMatchInviteState, { status: "ready" }>;
}) {
  const [actualChoice, setActualChoice] = useState<ChoiceId | null>(null);
  const [showResult, setShowResult] = useState(false);

  if (showResult && actualChoice) {
    const predictionMatched = invite.guess === actualChoice;
    const choicesMatched = invite.mine === actualChoice;
    const resultCopy = getResultCopy({ choicesMatched, predictionMatched });

    return (
      <CommunityScreenShell
        backHref="/home?view=together"
        backLabel="검사로 돌아가기"
        title="친구 성향 맞히기"
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
            <ResultRow label="친구의 선택" value={invite.mine} />
            <ResultRow label="친구가 예상한 내 선택" value={invite.guess} />
            <ResultRow emphasis label="내 실제 선택" value={actualChoice} />
          </div>

          <section className={styles.resultInsight}>
            <strong>
              {predictionMatched ? "친구의 예상이 맞았어요" : "예상과 달랐어요"}
            </strong>
            <p>
              이 한 장면의 선택만으로 성향을 정하지는 않아요. 서로 왜 그렇게
              골랐는지 이야기하면 차이를 더 재미있게 이해할 수 있어요.
            </p>
          </section>

          <footer className={styles.footer}>
            <Link
              className={styles.footerAction}
              href="/assessments/friend-match"
            >
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
      title="친구 성향 맞히기"
    >
      <main className={styles.body}>
        <div aria-label="친구 답변 1/1 단계" className={styles.progress}>
          <span data-active="true" />
        </div>

        <section className={styles.stepCopy}>
          <small>친구가 내 선택을 예상했어요</small>
          <h2>나는 실제로 어떤 답을 고를까요?</h2>
        </section>

        <AssessmentQuestionPrompt
          contextLabel="친구와 약속한 날"
          headingLevel={2}
          text="친구가 갑자기 일정을 바꾸자고 해요. 이때 나는?"
        />
        <AssessmentChoiceResponseOptions
          choices={choices}
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
  state,
}: {
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
      title="친구 성향 맞히기"
    >
      <main className={`${styles.body} ${styles.errorBody}`}>
        <section className={styles.errorState} role="alert">
          <span aria-hidden="true">N</span>
          <small>
            {expired ? "사용 기간이 지난 초대" : "확인할 수 없는 초대"}
          </small>
          <h2>
            {expired
              ? "초대 링크의 사용 기간이 지났어요"
              : "초대 링크를 확인할 수 없어요"}
          </h2>
          <p>
            {expired
              ? "친구에게 새 링크를 보내 달라고 부탁하거나, 내가 새 게임을 시작해 보세요."
              : "링크가 잘못되었거나 필요한 정보가 빠졌어요. 새 게임은 바로 시작할 수 있어요."}
          </p>
        </section>

        <footer className={styles.footer}>
          <Link
            className={styles.footerAction}
            href="/assessments/friend-match"
          >
            새 게임 시작하기
          </Link>
        </footer>
      </main>
    </CommunityScreenShell>
  );
}

function ResultRow({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: ChoiceId;
}) {
  return (
    <article data-emphasis={emphasis ? "true" : "false"}>
      <small>{label}</small>
      <strong>{getChoiceLabel(value)}</strong>
    </article>
  );
}

function getResultCopy({
  choicesMatched,
  predictionMatched,
}: {
  choicesMatched: boolean;
  predictionMatched: boolean;
}) {
  if (predictionMatched && choicesMatched) {
    return {
      description: "친구의 예상도 맞았고, 이번 상황에서 고른 답도 같아요.",
      title: "서로의 선택을 정확히 알았어요",
    };
  }

  if (predictionMatched) {
    return {
      description: "고른 답은 달랐지만, 친구는 내 선택을 정확히 예상했어요.",
      title: "다른 선택까지 잘 알고 있었어요",
    };
  }

  if (choicesMatched) {
    return {
      description: "친구의 예상과는 달랐지만, 실제로 고른 답은 서로 같아요.",
      title: "예상 밖의 공통점을 찾았어요",
    };
  }

  return {
    description: "친구의 예상과 내 실제 선택이 달랐고, 서로 고른 답도 달라요.",
    title: "서로 다른 생각을 발견했어요",
  };
}

function getChoiceLabel(choiceId: ChoiceId | null) {
  return choices.find((choice) => choice.id === choiceId)?.label ?? "선택 전";
}
