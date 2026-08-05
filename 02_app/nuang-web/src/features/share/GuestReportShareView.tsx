"use client";

import { ArrowRight, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ReportShareSheet } from "@/features/share/ReportShareSheet";
import type { ReportShareContent } from "@/features/share/report-share-contract";
import styles from "./GuestReportShareView.module.css";

const reportTypeCopy: Record<
  ReportShareContent["reportType"],
  { eyebrow: string; image: string }
> = {
  core: {
    eyebrow: "코어 검사 결과",
    image: "/images/share/nuang-result-share-core-v2.png",
  },
  lab: {
    eyebrow: "별난 연구소 결과",
    image: "/images/share/nuang-result-share-lab-v2.png",
  },
  topic: {
    eyebrow: "주제 검사 결과",
    image: "/images/share/nuang-result-share-topic-v2.png",
  },
};

export function GuestReportShareView({
  canonicalUrl,
  content,
}: {
  canonicalUrl: string;
  content: ReportShareContent;
}) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const presentation = reportTypeCopy[content.reportType];

  return (
    <main className={styles.root}>
      <header className={styles.appBar}>
        <Link href="/home">NUANG</Link>
        <button
          aria-haspopup="dialog"
          aria-label="결과 다시 공유"
          onClick={() => setIsShareOpen(true)}
          ref={shareButtonRef}
          type="button"
        >
          <Share2 aria-hidden="true" size={19} strokeWidth={1.8} />
        </button>
      </header>

      <article className={styles.report}>
        <div className={styles.visual}>
          <Image
            alt="뉴앙 결과를 함께 살펴보는 캐릭터"
            fill
            priority
            sizes="(max-width: 520px) 100vw, 520px"
            src={presentation.image}
          />
        </div>
        <section className={styles.hero}>
          <p>{presentation.eyebrow}</p>
          <h1>{content.title}</h1>
          <div className={styles.resultName}>
            {content.code ? <span>{content.code}</span> : null}
            <strong>{content.resultName}</strong>
          </div>
          <p className={styles.summary}>{content.summary}</p>
        </section>

        <section aria-labelledby="guest-share-highlights" className={styles.highlights}>
          <h2 id="guest-share-highlights">이 결과에서 눈에 띈 모습</h2>
          <ul>
            {content.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>

        <aside className={styles.privacy}>
          이 링크에는 답변 내용, 연락처, 계정 정보가 담기지 않아요.
        </aside>

        <section className={styles.next}>
          <p>내 결과도 궁금하다면</p>
          <Link href="/home?view=self">
            뉴앙 검사 둘러보기
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </Link>
        </section>
      </article>

      <ReportShareSheet
        canonicalUrl={canonicalUrl}
        content={content}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        returnFocusRef={shareButtonRef}
      />
    </main>
  );
}
