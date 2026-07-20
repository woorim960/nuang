"use client";

import { useState } from "react";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
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

type ChoiceId = (typeof choices)[number]["id"];

export function FriendTraitMatch() {
  const [step, setStep] = useState(0);
  const [myChoice, setMyChoice] = useState<ChoiceId | null>(null);
  const [friendChoice, setFriendChoice] = useState<ChoiceId | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const selectedChoice = step === 0 ? myChoice : friendChoice;

  return (
    <CommunityScreenShell
      backHref="/assessments"
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
              <p>
                {step === 0
                  ? "최근 6개월의 평소 모습을 떠올리며 더 가까운 답을 골라주세요."
                  : "정답을 맞히는 검사가 아니에요. 내가 친구를 어떻게 이해하고 있는지 가볍게 확인해요."}
              </p>
            </section>

            <p className={styles.question}>
              친구와 약속한 날, 친구가 갑자기 일정을 바꾸자고 해요. 이때 나는?
            </p>
            <div className={styles.choiceList}>
              {choices.map((choice, index) => (
                <button
                  aria-pressed={selectedChoice === choice.id}
                  key={choice.id}
                  onClick={() => {
                    if (step === 0) setMyChoice(choice.id);
                    else setFriendChoice(choice.id);
                  }}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <span>{choice.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <section className={styles.stepCopy}>
              <small>초대할 준비 완료</small>
              <h2>이제 친구의 실제 선택을 확인해 보세요</h2>
              <p>
                친구가 같은 질문에 답하면 두 사람이 같게 본 부분과 다르게 본
                이유를 나란히 보여드려요.
              </p>
            </section>

            <div className={styles.summary}>
              <article>
                <small>나의 선택</small>
                <strong>{getChoiceLabel(myChoice)}</strong>
              </article>
              <article>
                <small>내가 예상한 친구의 선택</small>
                <strong>{getChoiceLabel(friendChoice)}</strong>
              </article>
            </div>
            <p className={styles.guide}>
              같은 답이어도 이유는 다를 수 있어요. 결과에서는 궁합 점수 대신
              서로의 선택과 이유를 이해하기 쉽게 비교합니다.
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
    const inviteUrl = new URL(
      "/assessments/friend-match",
      window.location.origin,
    );
    inviteUrl.searchParams.set("invite", "friend-view");
    inviteUrl.searchParams.set("mine", myChoice ?? "");
    inviteUrl.searchParams.set("guess", friendChoice ?? "");

    if (window.navigator.share) {
      try {
        await window.navigator.share({
          text: "내가 예상한 너의 선택이 맞는지 확인해 줘!",
          title: "뉴앙 친구 성향 맞히기",
          url: inviteUrl.toString(),
        });
        setShareStatus("초대 화면을 열었어요.");
        return;
      } catch {
        return;
      }
    }

    await window.navigator.clipboard?.writeText(inviteUrl.toString());
    setShareStatus("초대 링크를 복사했어요.");
  }
}

function getChoiceLabel(choiceId: ChoiceId | null) {
  return choices.find((choice) => choice.id === choiceId)?.label ?? "선택 전";
}
