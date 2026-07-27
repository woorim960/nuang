import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  const fiveLetters = guide.chapters.find(
    (chapter) => chapter.slot === "five_letters",
  );
  const relationshipTopics = [
    {
      label: "마음 가는 사람 앞에서는",
      slot: "person_of_interest",
    },
    { label: "연인과 함께할 때", slot: "partner" },
    { label: "가족 안에서는", slot: "family" },
  ]
    .map((topic) => ({
      ...topic,
      chapter: guide.chapters.find((chapter) => chapter.slot === topic.slot),
    }))
    .filter(
      (
        topic,
      ): topic is typeof topic & {
        chapter: NonNullable<typeof topic.chapter>;
      } => Boolean(topic.chapter),
    );

  return (
    <section
      aria-labelledby="trait-map-bridge-title"
      className={styles.section}
    >
      <div className={styles.heading}>
        <h2 id="trait-map-bridge-title">{profileName}의 관계와 일상</h2>
      </div>

      {fiveLetters ? (
        <article className={styles.letterStory}>
          <p className={styles.topicLabel}>다섯 글자가 말해주는 것</p>
          <p className={styles.topicSummary}>{fiveLetters.summary}</p>
          <div className={styles.letterList}>
            {fiveLetters.sections.slice(0, 5).map((section) => {
              const [letter, meaning = section.title] = section.title.split(
                /\s*[—-]\s*/,
                2,
              );

              return (
                <div key={section.title}>
                  <strong>{letter}</strong>
                  <span>{meaning}</span>
                </div>
              );
            })}
          </div>
        </article>
      ) : null}

      <div className={styles.relationshipList}>
        {relationshipTopics.map(({ chapter, label }) => (
          <article className={styles.relationshipStory} key={chapter.id}>
            <p className={styles.topicLabel}>{label}</p>
            <h3>{chapter.summary}</h3>
            <p>{chapter.sections[0]?.paragraphs[0]}</p>
          </article>
        ))}
      </div>

      <div className={styles.detailGuide}>
        <Link href={`/map/${code}`}>
          {code} 성향지도 전체 보기
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </div>
    </section>
  );
}
