import styles from "./LegacyCoreBetaNotice.module.css";

export type LegacyCoreBetaNoticeContext =
  "home" | "map" | "my" | "result" | "runner";

const contextCopy: Record<
  LegacyCoreBetaNoticeContext,
  { body: string; title: string }
> = {
  home: {
    body: "현재 첫·정밀 성향 검사는 문항과 채점을 검증하는 중이에요. 시작하거나 이어서 받은 결과는 자기이해를 위한 참고용이며, 대표 뉴앙 코드로 확정되거나 공개·공유·비교에 사용되지 않아요.",
    title: "탐색적 비검증 베타",
  },
  map: {
    body: "검증 전 후보 코드의 설명을 보존한 화면이에요. 현재 성향 판정이나 공유의 근거로 사용할 수 없으며 검색 결과에는 노출하지 않아요.",
    title: "이전 베타 성향지도",
  },
  my: {
    body: "현재 보이는 코어 검사와 뉴앙 코드는 검증 전 베타예요. 자기이해를 위한 참고용이며, 대표 코드로 확정되거나 공개 프로필·공유·비교에 사용되지 않아요.",
    title: "탐색적 비검증 베타",
  },
  result: {
    body: "검증 전 문항과 채점으로 만든 이전 베타 결과예요. 자기이해를 위한 참고용이며, 대표 뉴앙 코드로 확정되거나 공개 프로필·공유·비교에 사용되지 않아요.",
    title: "탐색적 비검증 베타",
  },
  runner: {
    body: "현재 문항과 채점은 검증 전이에요. 결과는 자기이해를 위한 참고용이며, 대표 뉴앙 코드로 확정되거나 공개·공유·비교에 사용되지 않아요.",
    title: "탐색적 비검증 베타",
  },
};

export function LegacyCoreBetaNotice({
  className,
  context,
}: {
  className?: string;
  context: LegacyCoreBetaNoticeContext;
}) {
  const copy = contextCopy[context];

  return (
    <aside
      aria-label={`${copy.title} 안내`}
      className={`${styles.notice}${className ? ` ${className}` : ""}`}
      data-context={context}
    >
      <div className={styles.heading}>
        <strong>{copy.title}</strong>
        <span>참고용 · 공유 불가</span>
      </div>
      <p>{copy.body}</p>
    </aside>
  );
}
