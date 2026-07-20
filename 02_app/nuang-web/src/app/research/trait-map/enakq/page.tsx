import type { Metadata } from "next";
import {
  ArrowLeft,
  CircleCheck,
  CircleDashed,
  Database,
  FileSearch,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enakqTraitMapTemplateV1 } from "@/features/nuang-code/enakq-trait-map-template-v1";
import { traitMapContentReleaseId } from "@/features/nuang-code/trait-map-content-contract-v1";
import {
  readTraitMapReviewSnapshot,
  type TraitMapReviewSnapshot,
} from "@/features/nuang-code/trait-map-content-store";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "ENAKQ 콘텐츠 검토 | NUANG",
  robots: { follow: false, index: false },
};

export const dynamic = "force-dynamic";

const reviewRoles = [
  ["psychology", "심리 해석"],
  ["measurement", "측정 정합성"],
  ["product_safety", "제품 안전"],
  ["plain_language", "쉬운 문장"],
] as const;

export default async function EnakqTraitMapReviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const serviceClient = createSupabaseServiceClient();
  let snapshot = localSnapshot();
  let databaseReady = false;

  if (serviceClient) {
    try {
      snapshot = (await readTraitMapReviewSnapshot(serviceClient)) ?? snapshot;
      databaseReady = true;
    } catch {
      databaseReady = false;
    }
  }

  const gateSummary = reviewRoles.map(([role, label]) => ({
    label,
    passed: snapshot.atoms.filter(
      (atom) => readReviewStatus(atom.reviews, role) === "passed",
    ).length,
    role,
    total: snapshot.atoms.length,
  }));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="ENAKQ 성향지도로 돌아가기" href="/map/ENAKQ">
          <ArrowLeft aria-hidden="true" size={19} strokeWidth={1.65} />
        </Link>
        <div>
          <p>TRAIT MAP · INTERNAL</p>
          <h1>ENAKQ 콘텐츠 검토</h1>
        </div>
        <span aria-hidden="true" />
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>성향지도 운영 게이트</p>
          <h2>검토가 끝난 문장만 고객에게 보여요</h2>
          <p>
            앱 화면과 DB가 같은 콘텐츠 ID를 사용합니다. 문구별 근거와 네 가지
            검토가 모두 통과되기 전에는 공개 조회에서 자동으로 제외됩니다.
          </p>
        </div>
        <div
          className={databaseReady ? styles.storageReady : styles.storageLocal}
        >
          <Database aria-hidden="true" size={17} strokeWidth={1.6} />
          <span>{databaseReady ? "DB 동기화됨" : "로컬 계약 미리보기"}</span>
        </div>
      </section>

      <section aria-label="릴리스 요약" className={styles.releasePanel}>
        <div className={styles.releaseTop}>
          <div>
            <span>CONTENT RELEASE</span>
            <strong>{snapshot.releaseId}</strong>
          </div>
          <span className={styles.draftBadge}>
            {releaseLabel(snapshot.status)}
          </span>
        </div>
        <div className={styles.inventoryGrid}>
          <Summary label="축" value={snapshot.inventory.axes} suffix="개" />
          <Summary
            label="세부 특성"
            value={snapshot.inventory.facets}
            suffix="개"
          />
          <Summary
            label="역할형"
            value={snapshot.inventory.roleProfiles}
            suffix="개"
          />
          <Summary
            label="공개 문구"
            value={snapshot.inventory.publishedAtoms}
            suffix={`/${snapshot.inventory.contentAtoms}`}
          />
        </div>
        <div className={styles.blockedNotice}>
          <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.6} />
          <div>
            <strong>고객 공개 차단 중</strong>
            <p>
              현재 코드 체계와 역할형 명칭도 후보 상태입니다. 콘텐츠 검토만
              끝나도 측정 릴리스가 활성화되기 전에는 게시할 수 없습니다.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p>REQUIRED REVIEWS</p>
            <h2>필수 검토 네 가지</h2>
          </div>
          <span>문구 {snapshot.atoms.length}개 기준</span>
        </div>
        <div className={styles.gateList}>
          {gateSummary.map((gate) => (
            <div className={styles.gateRow} key={gate.role}>
              {gate.passed === gate.total && gate.total > 0 ? (
                <CircleCheck aria-hidden="true" size={19} strokeWidth={1.7} />
              ) : (
                <CircleDashed aria-hidden="true" size={19} strokeWidth={1.6} />
              )}
              <div>
                <strong>{gate.label}</strong>
                <span>{reviewPurpose(gate.role)}</span>
              </div>
              <b>
                {gate.passed}/{gate.total}
              </b>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p>CONTENT ATOMS</p>
            <h2>문구별 검토 현황</h2>
          </div>
          <span>근거와 출처를 함께 확인</span>
        </div>
        <div className={styles.atomList}>
          {snapshot.atoms.map((atom) => (
            <article
              className={styles.atomRow}
              key={`${atom.atomId}-${atom.version}`}
            >
              <div className={styles.atomTop}>
                <div>
                  <span>{slotLabel(atom.slot)}</span>
                  <small>{contextLabel(atom.context)}</small>
                </div>
                <span className={styles.stateBadge}>
                  {publicationLabel(atom.publicationState)}
                </span>
              </div>
              <p>{atom.copyShort}</p>
              <div className={styles.atomMeta}>
                <span>
                  <FileSearch aria-hidden="true" size={14} strokeWidth={1.6} />
                  주장 {atom.claimCount} · 출처 {atom.evidenceCount}
                </span>
                <code>{atom.atomId}</code>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          이 화면은 localhost 내부 검토용입니다. 고객용 성향지도에는 승인된
          문구만 별도 공개 조회를 통해 전달됩니다.
        </p>
        <Link href="/map/ENAKQ">ENAKQ 화면 확인하기</Link>
      </footer>
    </main>
  );
}

function Summary({
  label,
  suffix,
  value,
}: {
  label: string;
  suffix: string;
  value: number;
}) {
  return (
    <div className={styles.summaryItem}>
      <span>{label}</span>
      <strong>
        {value}
        <small>{suffix}</small>
      </strong>
    </div>
  );
}

function localSnapshot(): TraitMapReviewSnapshot {
  return {
    atoms: enakqTraitMapTemplateV1.contentAtoms.map((atom) => ({
      atomId: atom.atomId,
      claimCount: atom.claimRefs.length,
      context: atom.context,
      copyShort: atom.copy.short,
      evidenceCount: atom.evidenceRefs.length,
      publicationState: atom.publicationState,
      reviews: {
        measurement: atom.reviews.measurement,
        plain_language: atom.reviews.plainLanguage,
        product_safety: atom.reviews.productSafety,
        psychology: atom.reviews.psychology,
      },
      slot: atom.slot,
      version: atom.version,
    })),
    contractVersion: "nuang-trait-map-content.v1",
    inventory: {
      axes: 5,
      contentAtoms: enakqTraitMapTemplateV1.contentAtoms.length,
      facets: 10,
      publishedAtoms: 0,
      roleProfiles: 32,
    },
    releaseId: traitMapContentReleaseId,
    status: "draft",
  };
}

function readReviewStatus(
  reviews: Record<string, string> | null,
  role: string,
) {
  return reviews?.[role] ?? "not_started";
}

function releaseLabel(status: TraitMapReviewSnapshot["status"]) {
  const labels = {
    approved: "공개 승인",
    draft: "설계 중",
    in_review: "검토 중",
    published: "공개됨",
    retired: "종료됨",
  } as const;
  return labels[status];
}

function publicationLabel(
  state: TraitMapReviewSnapshot["atoms"][number]["publicationState"],
) {
  const labels = {
    approved: "승인됨",
    published: "공개됨",
    research_only: "연구 전용",
    retired: "종료됨",
    review_candidate: "검토 후보",
  } as const;
  return labels[state];
}

function slotLabel(slot: TraitMapReviewSnapshot["atoms"][number]["slot"]) {
  const labels: Partial<Record<typeof slot, string>> = {
    daily_life: "일상",
    evidence_note: "근거와 한계",
    family: "가족",
    friend: "친구",
    limitation: "해석 경계",
    partner: "연인",
    person_of_interest: "마음 가는 사람",
    role_name_meaning: "역할 이름",
    summary: "대표 요약",
    work: "일·공부",
  };
  return labels[slot] ?? slot;
}

function contextLabel(context: string) {
  const labels: Record<string, string> = {
    family: "가족 맥락",
    friend: "친구 맥락",
    general: "공통 설명",
    partner: "연인 맥락",
    person_of_interest: "호감 관계 맥락",
    work: "일·공부 맥락",
  };
  return labels[context] ?? context;
}

function reviewPurpose(role: (typeof reviewRoles)[number][0]) {
  const copy = {
    measurement: "측정한 범위만 말하는지 확인",
    plain_language: "누구나 한 번에 이해하는지 확인",
    product_safety: "낙인·단정·과도한 추론을 차단",
    psychology: "심리 개념과 해석이 타당한지 확인",
  } as const;
  return copy[role];
}
