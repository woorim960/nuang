"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { FeedPollStatsPayload } from "@/features/feed/server-read";
import styles from "./page.module.css";

type CodeRow = FeedPollStatsPayload["codeRows"][number];

export function CodePerspectiveExplorer({ rows }: { rows: CodeRow[] }) {
  const [selectedCode, setSelectedCode] = useState(rows[0]?.code ?? "");
  const selectedRow =
    rows.find((row) => row.code === selectedCode) ?? rows[0] ?? null;
  const perspectiveCopy = useMemo(
    () => (selectedRow ? createPerspectiveCopy(selectedRow) : ""),
    [selectedRow],
  );

  if (!selectedRow) return null;

  return (
    <>
      <div
        aria-label="투표에 참여한 뉴앙 코드"
        className={styles.codeResultGrid}
      >
        {rows.map((row) => (
          <button
            aria-pressed={row.code === selectedRow.code}
            className={styles.codeResultButton}
            key={row.code}
            onClick={() => setSelectedCode(row.code)}
            type="button"
          >
            <strong>{row.code}</strong>
            <span>{row.totalVotes.toLocaleString("ko-KR")}명</span>
          </button>
        ))}
      </div>

      <section aria-live="polite" className={styles.codeResultDetail}>
        <div className={styles.codeDetailHead}>
          <strong>{selectedRow.code}의 관점</strong>
          <span>{selectedRow.totalVotes.toLocaleString("ko-KR")}명 참여</span>
        </div>
        <div className={styles.voteList}>
          {selectedRow.options.map((option) => (
            <div key={`${selectedRow.code}_${option.label}`}>
              <div className={styles.voteLabel}>
                <span>{option.label}</span>
                <strong>{option.ratio}%</strong>
              </div>
              <div className={styles.voteTrack}>
                <span style={{ "--vote": option.ratio } as CSSProperties} />
              </div>
            </div>
          ))}
        </div>
        <p className={styles.perspectiveNote}>{perspectiveCopy}</p>
      </section>
    </>
  );
}

function createPerspectiveCopy(row: CodeRow) {
  const ordered = [...row.options].sort(
    (left, right) => right.ratio - left.ratio,
  );
  const first = ordered[0];
  const second = ordered[1];

  if (!first) return "아직 선택 결과를 정리하고 있어요.";

  if (second && Math.abs(first.ratio - second.ratio) <= 10) {
    return `‘${first.label}’ ${first.ratio}%와 ‘${second.label}’ ${second.ratio}%로 선택이 고르게 나뉘었어요. 같은 코드 안에서도 상황과 경험에 따라 선택은 달라질 수 있어요.`;
  }

  return `${row.code} 참여자에게서 ‘${first.label}’ 선택이 ${first.ratio}%로 나타났어요. 이 결과는 참여자의 현재 선택을 보여주며, 코드 전체의 생각을 단정하지 않아요.`;
}
