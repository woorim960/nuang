import Link from "next/link";
import type { StoredFreeTopicResult } from "@/features/assessment/free-topic-storage";
import {
  getTopicTraitImpactPresentation,
  type TopicTraitImpactSnapshot,
} from "@/features/assessment/topic-trait-impact";
import styles from "./TopicTraitImpactCard.module.css";

export function TopicTraitImpactCard({
  loginHref = "/login",
  onRetry,
  snapshot,
  sync,
}: {
  loginHref?: string;
  onRetry?: () => void;
  snapshot?: TopicTraitImpactSnapshot;
  sync: StoredFreeTopicResult["sync"];
}) {
  if (!snapshot) {
    const pending = getPendingPresentation(sync);
    if (!pending) return null;

    return (
      <section aria-live="polite" className={styles.card} data-state="pending">
        <header className={styles.header}>
          <p>이번 검사와 내 뉴앙코드</p>
          <span>{pending.badge}</span>
        </header>
        <h2>{pending.title}</h2>
        <p className={styles.body}>{pending.body}</p>
        {sync.lastError === "login_required" ? (
          <Link className={styles.action} href={loginHref}>
            로그인하고 이어서 반영하기
          </Link>
        ) : sync.status === "failed" && onRetry ? (
          <button className={styles.action} onClick={onRetry} type="button">
            다시 반영하기
          </button>
        ) : null}
      </section>
    );
  }

  const presentation = getTopicTraitImpactPresentation(snapshot);
  const changedPositions = getChangedCodePositions(snapshot);
  const remainingCount = Math.max(
    0,
    presentation.changedDomainCount - presentation.items.length,
  );

  return (
    <section
      aria-labelledby="topic-trait-impact-title"
      className={styles.card}
      data-degree={snapshot.degree}
      data-state={snapshot.state}
    >
      <header className={styles.header}>
        <p>이번 검사와 내 뉴앙코드</p>
        <span>{presentation.badge}</span>
      </header>
      <h2 id="topic-trait-impact-title">{presentation.title}</h2>
      <p className={styles.body}>{presentation.body}</p>

      {snapshot.codeChanged && snapshot.before && snapshot.after ? (
        <div
          aria-label={buildCodeChangeAriaLabel(snapshot)}
          className={styles.codeComparison}
          role="img"
        >
          <CodeRow
            changedPositions={changedPositions}
            code={snapshot.before.code}
            label="이전"
          />
          <CodeRow
            changedPositions={changedPositions}
            code={snapshot.after.code}
            label="현재"
          />
        </div>
      ) : null}

      {presentation.items.length > 0 ? (
        <ul className={styles.impactList}>
          {presentation.items.map((item) => (
            <li key={item.domainId}>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {remainingCount > 0 ? (
        <p className={styles.remaining}>
          그 밖의 {remainingCount}개 성향 설명에서도 변화가 나타났어요.
        </p>
      ) : null}

      <p className={styles.note}>{presentation.note}</p>
    </section>
  );
}

function CodeRow({
  changedPositions,
  code,
  label,
}: {
  changedPositions: Set<number>;
  code: string;
  label: string;
}) {
  return (
    <div className={styles.codeRow}>
      <strong>{label}</strong>
      <div>
        {code.split("").map((symbol, index) => (
          <span
            data-changed={changedPositions.has(index)}
            key={`${index}-${symbol}`}
          >
            {symbol}
          </span>
        ))}
      </div>
    </div>
  );
}

function getPendingPresentation(sync: StoredFreeTopicResult["sync"]) {
  if (sync.status === "synced") return null;

  if (sync.lastError === "login_required") {
    return {
      badge: "로그인 후 반영",
      body: "검사 결과는 이 기기에 저장되어 있어요.",
      title: "로그인하면 내 코드에 이어서 반영해요",
    };
  }

  if (sync.status === "failed") {
    return {
      badge: "연결 대기 중",
      body: "검사 결과는 안전하게 보관하고 있어요. 인터넷이 연결되면 다시 반영해요.",
      title: "연결되면 달라진 부분을 확인할 수 있어요",
    };
  }

  return {
    badge: "반영 중",
    body: "잠시 후 이번 검사로 달라진 부분을 보여드릴게요.",
    title: "이번 답을 내 코드에 더하고 있어요",
  };
}

function getChangedCodePositions(snapshot: TopicTraitImpactSnapshot) {
  const positions = new Set<number>();
  const beforeCode = snapshot.before?.code ?? "";
  const afterCode = snapshot.after?.code ?? "";
  const count = Math.max(beforeCode.length, afterCode.length);
  for (let index = 0; index < count; index += 1) {
    if (beforeCode[index] !== afterCode[index]) positions.add(index);
  }
  return positions;
}

function buildCodeChangeAriaLabel(snapshot: TopicTraitImpactSnapshot) {
  const beforeCode = (snapshot.before?.code ?? "").split("").join(", ");
  const afterCode = (snapshot.after?.code ?? "").split("").join(", ");
  const details = snapshot.affectedDomains
    .filter(
      (domain) =>
        domain.beforeSymbol &&
        domain.afterSymbol &&
        domain.beforeSymbol !== domain.afterSymbol,
    )
    .map(
      (domain) =>
        `${domain.label}: ${domain.beforeSymbol}에서 ${domain.afterSymbol}로 변경`,
    )
    .join(", ");
  return `이전 코드 ${beforeCode}, 현재 코드 ${afterCode}${details ? `, ${details}` : ""}`;
}
