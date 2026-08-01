import { ExternalLink } from "lucide-react";
import { getTopicAssessmentEvidence } from "@/features/assessment/topic-assessment-evidence";
import styles from "./AssessmentEvidenceSources.module.css";

export function AssessmentEvidenceSources({ slug }: { slug: string }) {
  const evidence = getTopicAssessmentEvidence(slug);
  if (!evidence) return null;

  return (
    <section
      aria-labelledby={`${slug}-research-evidence`}
      className={styles.root}
    >
      <p>검사 설계 근거</p>
      <h2 id={`${slug}-research-evidence`}>연구를 읽고 문항에 담았어요</h2>
      <span>{evidence.designSummary}</span>
      <ul className={styles.principles}>
        {evidence.principles.map((principle) => (
          <li key={principle}>{principle}</li>
        ))}
      </ul>
      <details>
        <summary>
          참고한 연구 {evidence.sources.length}편 보기
          <span aria-hidden="true">+</span>
        </summary>
        <ol>
          {evidence.sources.map((source) => (
            <li key={source.href}>
              <a href={source.href} rel="noreferrer" target="_blank">
                <strong>
                  {source.authors} ({source.year})
                </strong>
                <span>
                  {source.title} · {source.venue}
                </span>
                <small>{source.focus}</small>
                <ExternalLink aria-hidden="true" size={14} strokeWidth={1.7} />
              </a>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
