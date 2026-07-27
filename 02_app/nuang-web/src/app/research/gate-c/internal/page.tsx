import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  FileCheck2,
  Map,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateCFormIds } from "@/features/research/gate-c/gate-c-study-contract";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "진행자용 문항 확인 세션 | NUANG",
  robots: { follow: false, index: false },
};

export default function GateCInternalResearchHomePage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NUANG RESEARCH · GATE C · INTERNAL</p>
        <h1>60문항 인지 인터뷰 러너</h1>
        <p>
          배정 폼 하나(12문항)를 선택하면 첫 응답 뒤 진행자 기록으로
          이어집니다.
        </p>
      </section>

      <section className={styles.boundary}>
        <ShieldCheck aria-hidden="true" size={22} strokeWidth={1.7} />
        <div>
          <strong>진행자용 · 로컬 파일 내보내기</strong>
          <p>
            공개 자가 참여 폼과 분리되어 있습니다. 완료한 가명 세션은 승인된
            별도 위치에 보관합니다.
          </p>
        </div>
      </section>

      <Link
        className={styles.analysisLink}
        href="/research/gate-c/internal/analysis"
      >
        <BarChart3 aria-hidden="true" size={20} strokeWidth={1.7} />
        <span>
          <strong>자동 분석</strong>
          <small>표본 수와 문항별 검수 신호를 확인합니다.</small>
        </span>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
      </Link>

      <Link
        className={styles.analysisLink}
        href="/research/trait-map/internal/analysis"
      >
        <Map aria-hidden="true" size={20} strokeWidth={1.7} />
        <span>
          <strong>성향지도 피드백</strong>
          <small>섹션별 적합도와 전문가 검토 신호를 확인합니다.</small>
        </span>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
      </Link>

      <section aria-labelledby="form-heading" className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="form-heading">배정 폼</h2>
          </div>
          <span>5개 폼 · 총 60문항</span>
        </div>

        <div className={styles.formList}>
          {gateCFormIds.map((formId, index) => (
            <Link
              className={styles.formRow}
              href={`/research/gate-c/${formId.toLowerCase().replace("_", "-")}`}
              key={formId}
            >
              <span className={styles.formIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.formCopy}>
                <strong>{formId.replace("FORM_", "폼 ")}</strong>
              </span>
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
            </Link>
          ))}
        </div>
      </section>

      <footer className={styles.footerNote}>
        <FileCheck2 aria-hidden="true" size={18} strokeWidth={1.7} />
        <p>
          실제 모집·동의·보상 절차가 승인되기 전에는 연습 세션으로만 사용해
          주세요.
        </p>
      </footer>
    </main>
  );
}
