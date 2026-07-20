"use client";

import { ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import {
  enakqTraitMapTemplateV1,
  type EnakqTraitMapContext,
} from "@/features/nuang-code/enakq-trait-map-template-v1";
import styles from "@/features/map/EnakqTraitMapTemplate.module.css";

const template = enakqTraitMapTemplateV1;

export function EnakqTraitMapTemplate() {
  const [activeContextId, setActiveContextId] = useState(
    template.contexts[0].id,
  );
  const activeContext =
    template.contexts.find((context) => context.id === activeContextId) ??
    template.contexts[0];

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="성향지도로 돌아가기" href="/map">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <span>성향지도 상세</span>
        <span aria-hidden="true" className={styles.headerSpacer} />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>5글자 뉴앙 코드</p>
          <CodeLetters />
          <h1>{template.profileName}</h1>
          <p>{template.summary}</p>
        </div>
        <div className={styles.characterWrap}>
          <span aria-hidden="true" />
          <NuangCharacter motif="purple" size="lg" />
        </div>
      </section>

      <section
        className={styles.readingGuide}
        aria-labelledby="reading-guide-title"
      >
        <div>
          <span>읽는 법</span>
          <h2 id="reading-guide-title">코드보다 내 장면을 함께 떠올려요</h2>
        </div>
        <ol>
          {template.readingGuide.map((guide, index) => (
            <li key={guide}>
              <span>{index + 1}</span>
              {guide}
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="role-name-title">
        <SectionHeading
          eyebrow="이름의 의미"
          id="role-name-title"
          title={template.roleNameMeaning.title}
        />
        <p className={styles.bodyCopy}>{template.roleNameMeaning.body}</p>
        <p className={styles.quietNote}>{template.roleNameMeaning.boundary}</p>
      </section>

      <section className={styles.section} aria-labelledby="axis-title">
        <SectionHeading
          eyebrow="다섯 자리"
          id="axis-title"
          title="한 자리씩 보면 더 분명해져요"
        />
        <div className={styles.axisList}>
          {template.axes.map((axis, index) => (
            <details
              className={styles.axisItem}
              key={axis.symbol}
              open={index === 0}
            >
              <summary>
                <span className={styles.axisSymbol}>{axis.symbol}</span>
                <span className={styles.axisSummaryCopy}>
                  <small>
                    {axis.position}번째 · {axis.label}
                  </small>
                  <strong>{axis.detailTitle}</strong>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={styles.chevron}
                  size={18}
                  strokeWidth={1.7}
                />
              </summary>
              <div className={styles.axisBody}>
                <p>{axis.description}</p>
                <span>{axis.guardrail}</span>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section
        className={styles.processSection}
        aria-labelledby="process-title"
      >
        <span>더 자세히 볼 때</span>
        <h2 id="process-title">{template.processBoundary.title}</h2>
        <p>{template.processBoundary.body}</p>
      </section>

      <section className={styles.section} aria-labelledby="context-title">
        <SectionHeading
          eyebrow="상황별로 보기"
          id="context-title"
          title="사람과 상황이 달라지면 모습도 달라져요"
        />
        <div
          aria-label="상황 선택"
          className={styles.contextTabs}
          role="tablist"
        >
          {template.contexts.map((context) => (
            <button
              aria-controls="enakq-context-panel"
              aria-selected={context.id === activeContext.id}
              key={context.id}
              onClick={() => setActiveContextId(context.id)}
              role="tab"
              type="button"
            >
              {context.label}
            </button>
          ))}
        </div>
        <ContextPanel context={activeContext} />
      </section>

      <section
        className={styles.evidenceSection}
        aria-labelledby="evidence-title"
      >
        <SectionHeading
          eyebrow="안전하게 이해하기"
          id="evidence-title"
          title={template.evidenceNote.title}
        />
        <p>{template.evidenceNote.body}</p>
        <Link href="/map">다른 뉴앙 코드 둘러보기</Link>
      </section>
    </article>
  );
}

function CodeLetters() {
  return (
    <p aria-label={`뉴앙 코드 ${template.code}`} className={styles.codeLetters}>
      {template.code.split("").map((letter, index) => (
        <span data-position={index + 1} key={`${letter}-${index}`}>
          {letter}
        </span>
      ))}
    </p>
  );
}

function ContextPanel({ context }: { context: EnakqTraitMapContext }) {
  return (
    <div
      aria-live="polite"
      className={styles.contextPanel}
      id="enakq-context-panel"
      key={context.id}
      role="tabpanel"
    >
      <span>{context.label}에서 살펴볼 점</span>
      <h3>{context.title}</h3>
      <p>{context.body}</p>
      <div>
        <small>이렇게 확인해 보세요</small>
        <strong>{context.prompt}</strong>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  id,
  title,
}: {
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span>{eyebrow}</span>
      <h2 id={id}>{title}</h2>
    </div>
  );
}
