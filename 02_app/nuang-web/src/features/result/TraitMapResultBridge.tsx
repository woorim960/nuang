import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { getPublishedTraitMapCustomerGuide } from "@/features/nuang-code/trait-map-customer-guide-registry";
import styles from "./TraitMapResultBridge.module.css";

type TraitMapResultBridgeProps = { code: string; profileName: string };

/** 결과 리포트와 성향지도를 잇는 공통 요약 블록입니다. */
export function TraitMapResultBridge({
  code,
  profileName,
}: TraitMapResultBridgeProps) {
  const guide = getPublishedTraitMapCustomerGuide(code);
  if (!guide) return null;
  const featuredSlots = ["core_pattern", "role_meaning", "strength_and_growth"];
  const chapters = featuredSlots
    .map((slot) => guide.chapters.find((chapter) => chapter.slot === slot))
    .filter((chapter): chapter is NonNullable<typeof chapter> =>
      Boolean(chapter),
    );

  return (
    <section
      aria-labelledby="trait-map-bridge-title"
      className={styles.section}
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            <BookOpen aria-hidden="true" size={15} strokeWidth={1.7} />
            성향지도 미리보기
          </p>
          <h2 id="trait-map-bridge-title">
            {code} · {profileName}
          </h2>
          <p className={styles.description}>
            이 성향이 관계와 일상에서 어떻게 나타나는지 중요한 내용부터
            골랐어요.
          </p>
        </div>
        <Link
          aria-label={`${code} 성향지도 상세 열기`}
          className={styles.allLink}
          href={`/map/${code}`}
        >
          전체 보기
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </div>
      <div className={styles.chapterList}>
        {chapters.map((chapter) => (
          <Link
            className={styles.chapter}
            href={`/map/${code}#${chapter.id}`}
            key={chapter.id}
          >
            <span>{String(chapter.number).padStart(2, "0")}</span>
            <div>
              <p>{chapter.title}</p>
              <small>{chapter.summary}</small>
            </div>
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.7} />
          </Link>
        ))}
      </div>
    </section>
  );
}
