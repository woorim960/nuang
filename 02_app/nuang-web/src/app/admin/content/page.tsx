import { BookOpenCheck, ChevronDown, LibraryBig } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminContentActions } from "@/features/admin/AdminContentActions";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  readAdminContent,
  type AdminContentRelease,
  type AdminContentReview,
} from "@/features/admin/server-admin-content";
import shared from "@/features/admin/AdminShared.module.css";
import { candidateProfileNameCatalog } from "@/features/nuang-code/candidate-profile-names";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "성향 콘텐츠 운영 | NUANG",
};

const reviewRoles = [
  "psychology",
  "measurement",
  "plain_language",
  "product_safety",
] as const;

type ContentView = "releases" | "reviews";

type ContentReviewGroup = {
  atomId: string;
  atomState: string;
  atomVersion: number;
  copyShort: string;
  entityRef: string;
  releaseId: string;
  reviews: AdminContentReview[];
  slot: string;
  updatedAt: string;
};

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const view: ContentView =
    (await searchParams).view === "reviews" ? "reviews" : "releases";
  const data = await readAdminContent(context.client).catch(() => null);
  const reviewGroups = data ? groupContentReviews(data.reviews) : [];
  const pendingGroups = reviewGroups.filter(needsOperatorAttention);

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>성향지도 문구 검토와 게시</p>
          <h1>성향 콘텐츠</h1>
        </div>
        <span className={shared.headerAction}>
          <LibraryBig aria-hidden="true" size={17} strokeWidth={1.7} />
          {pendingGroups.length}개 확인
        </span>
      </header>

      <nav aria-label="성향 콘텐츠 운영 구분" className={styles.tabs}>
        <Link
          aria-current={view === "releases" ? "page" : undefined}
          data-active={view === "releases"}
          href="/admin/content?view=releases"
        >
          게시 버전
          <span>{data?.releases.length ?? 0}</span>
        </Link>
        <Link
          aria-current={view === "reviews" ? "page" : undefined}
          data-active={view === "reviews"}
          href="/admin/content?view=reviews"
        >
          문구 검토
          <span>{pendingGroups.length}</span>
        </Link>
      </nav>

      <ContentGuide view={view} />

      {!data ? (
        <section className={shared.error}>
          <strong>성향 콘텐츠를 불러오지 못했습니다</strong>
          <p>데이터베이스 연결과 성향지도 콘텐츠 표를 확인해 주세요.</p>
        </section>
      ) : view === "releases" ? (
        <ReleaseList releases={data.releases} />
      ) : (
        <ReviewList groups={pendingGroups} />
      )}
    </main>
  );
}

function ContentGuide({ view }: { view: ContentView }) {
  const steps =
    view === "reviews"
      ? [
          ["문장을 읽어요", "어느 성향의 어떤 상황 설명인지 먼저 확인합니다."],
          [
            "네 분야를 확인해요",
            "심리학·성향검사·쉬운 문장·서비스 안전을 각각 판단합니다.",
          ],
          [
            "콘텐츠를 승인해요",
            "네 분야가 모두 통과한 문구만 게시 버전에 포함합니다.",
          ],
        ]
      : [
          [
            "문구 검토를 끝내요",
            "게시할 모든 문구가 네 분야 검토와 승인을 마쳐야 합니다.",
          ],
          [
            "구성을 확인해요",
            "5개 축·10개 세부 성향·32개 유형과 설명 문구 수를 확인합니다.",
          ],
          [
            "고객에게 게시해요",
            "게시 준비가 끝난 버전만 실제 성향지도에 적용합니다.",
          ],
        ];

  return (
    <section className={`${shared.panel} ${styles.operationGuide}`}>
      <header>
        <span className={styles.guideIcon}>
          <BookOpenCheck aria-hidden="true" size={20} strokeWidth={1.7} />
        </span>
        <div>
          <strong>이 화면은 이렇게 사용해요</strong>
          <p>
            {view === "reviews"
              ? "고객에게 보여줄 성향 설명이 정확하고 이해하기 쉬운지 확인합니다."
              : "검토를 마친 성향지도 콘텐츠를 한 묶음으로 고객에게 게시합니다."}
          </p>
        </div>
      </header>
      <ol>
        {steps.map(([title, description], index) => (
          <li key={title}>
            <b>{index + 1}</b>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.guideBoundary}>
        ‘고객에게 게시’를 누르기 전까지 현재 앱의 성향지도는 바뀌지 않습니다.
      </p>
    </section>
  );
}

function ReleaseList({ releases }: { releases: AdminContentRelease[] }) {
  return (
    <section className={shared.panel}>
      <div className={shared.panelHeader}>
        <h2>고객에게 게시할 콘텐츠 묶음</h2>
        <span>최근 만든 순</span>
      </div>
      {releases.length === 0 ? (
        <div className={shared.empty}>
          <strong>아직 만든 게시 버전이 없습니다</strong>
          <p>
            성향지도 데이터를 등록하면 이곳에서 검토하고 게시할 수 있습니다.
          </p>
        </div>
      ) : (
        <div className={styles.releaseList}>
          {releases.map((release) => (
            <ReleaseCard key={release.releaseId} release={release} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReleaseCard({ release }: { release: AdminContentRelease }) {
  const status = releaseStatusCopy(release);
  const approvedCount = release.atomCounts.approved ?? 0;
  const publishedCount = release.atomCounts.published ?? 0;
  const reviewPassCount = release.reviewCounts.passed ?? 0;
  const expectedReviewCount = release.inventory.atoms * reviewRoles.length;

  return (
    <article>
      <header>
        <div>
          <span className={styles.itemEyebrow}>
            {formatDate(release.createdAt)} 생성
          </span>
          <h3>{releaseDisplayName(release)}</h3>
        </div>
        <em className={shared.status} data-tone={releaseTone(release.status)}>
          {releaseLabel(release.status)}
        </em>
      </header>

      <div className={styles.nextAction} data-tone={status.tone}>
        <strong>{status.title}</strong>
        <span>{status.description}</span>
      </div>

      <dl className={styles.inventory}>
        <Inventory
          label="뉴앙 코드 축"
          target={5}
          value={release.inventory.axes}
        />
        <Inventory
          label="세부 성향"
          target={10}
          value={release.inventory.facets}
        />
        <Inventory
          label="성향 유형"
          target={32}
          value={release.inventory.profiles}
        />
        <Inventory label="설명 문구" value={release.inventory.atoms} />
      </dl>

      <div className={styles.releaseProgress}>
        <span>
          네 분야 검토 <strong>{reviewPassCount}</strong>/{expectedReviewCount}
        </span>
        <span>
          콘텐츠 승인 <strong>{approvedCount}</strong>/{release.inventory.atoms}
        </span>
        <span>
          고객 공개 <strong>{publishedCount}</strong>/{release.inventory.atoms}
        </span>
      </div>

      {["approved", "draft", "in_review"].includes(release.status) ? (
        <AdminContentActions
          mode="release"
          releaseStatus={release.status}
          target={{ releaseId: release.releaseId }}
        />
      ) : null}

      <details className={styles.technicalDetails}>
        <summary>
          버전 식별 정보
          <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
        </summary>
        <dl>
          <div>
            <dt>내부 버전 번호</dt>
            <dd>{release.releaseId}</dd>
          </div>
          <div>
            <dt>콘텐츠 규칙</dt>
            <dd>{release.contractVersion}</dd>
          </div>
          <div>
            <dt>뉴앙 코드 규칙</dt>
            <dd>{release.codeSchemeVersion}</dd>
          </div>
          <div>
            <dt>성향 별칭 규칙</dt>
            <dd>{release.profileNameReleaseId}</dd>
          </div>
        </dl>
      </details>
    </article>
  );
}

function ReviewList({ groups }: { groups: ContentReviewGroup[] }) {
  return (
    <section className={shared.panel}>
      <div className={shared.panelHeader}>
        <h2>확인이 필요한 문구</h2>
        <span>{groups.length}개 콘텐츠</span>
      </div>
      {groups.length === 0 ? (
        <div className={shared.empty}>
          <strong>확인할 문구가 없습니다</strong>
          <p>
            모든 문구가 통과됐거나 아직 검토할 콘텐츠가 등록되지 않았습니다.
          </p>
        </div>
      ) : (
        <div className={styles.reviewList}>
          {groups.slice(0, 200).map((group) => (
            <ReviewGroup
              group={group}
              key={`${group.releaseId}-${group.atomId}-${group.atomVersion}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewGroup({ group }: { group: ContentReviewGroup }) {
  const passedCount = group.reviews.filter(
    (review) => review.reviewStatus === "passed",
  ).length;
  const allPassed =
    reviewRoles.every((role) =>
      group.reviews.some(
        (review) =>
          review.reviewRole === role && review.reviewStatus === "passed",
      ),
    ) && group.reviews.length >= reviewRoles.length;
  const needsChange = group.reviews.some(
    (review) => review.reviewStatus === "changes_requested",
  );
  const canApprove =
    allPassed && !["approved", "published"].includes(group.atomState);
  const profile = candidateProfileNameCatalog[group.entityRef];

  return (
    <article>
      <header>
        <div>
          <span className={styles.itemEyebrow}>
            {group.entityRef}
            {profile ? ` · ${profile.displayName}` : ""}
          </span>
          <h3>{slotLabel(group.slot)}</h3>
        </div>
        <em
          className={shared.status}
          data-tone={needsChange ? "danger" : canApprove ? "brand" : "warning"}
        >
          {needsChange
            ? "수정 필요"
            : canApprove
              ? "승인 필요"
              : `${passedCount}/4 완료`}
        </em>
      </header>

      <blockquote>{group.copyShort}</blockquote>

      <div className={styles.reviewChecks}>
        {reviewRoles.map((role) => {
          const review = group.reviews.find((item) => item.reviewRole === role);
          return (
            <section key={role}>
              <div>
                <strong>{roleLabel(role)}</strong>
                <span>{reviewPurpose(role)}</span>
              </div>
              {review ? (
                review.reviewStatus === "passed" ? (
                  <em className={shared.status} data-tone="success">
                    확인 완료
                  </em>
                ) : (
                  <AdminContentActions
                    mode="review"
                    target={{
                      atomId: review.atomId,
                      atomVersion: review.atomVersion,
                      releaseId: review.releaseId,
                      reviewRole: review.reviewRole,
                    }}
                  />
                )
              ) : (
                <em className={shared.status} data-tone="danger">
                  검토 항목 없음
                </em>
              )}
            </section>
          );
        })}
      </div>

      {canApprove ? (
        <div className={styles.approvalAction}>
          <div>
            <strong>네 분야 확인이 모두 끝났어요</strong>
            <span>이 문구를 게시 버전에 포함하려면 콘텐츠를 승인하세요.</span>
          </div>
          <AdminContentActions
            mode="atom"
            target={{
              atomId: group.atomId,
              atomVersion: group.atomVersion,
              releaseId: group.releaseId,
            }}
          />
        </div>
      ) : null}

      <details className={styles.technicalDetails}>
        <summary>
          콘텐츠 식별 정보
          <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
        </summary>
        <dl>
          <div>
            <dt>콘텐츠 번호</dt>
            <dd>{group.atomId}</dd>
          </div>
          <div>
            <dt>문구 버전</dt>
            <dd>{group.atomVersion}</dd>
          </div>
          <div>
            <dt>게시 버전</dt>
            <dd>{group.releaseId}</dd>
          </div>
          <div>
            <dt>최근 변경</dt>
            <dd>{formatDateTime(group.updatedAt)}</dd>
          </div>
        </dl>
      </details>
    </article>
  );
}

function Inventory({
  label,
  target,
  value,
}: {
  label: string;
  target?: number;
  value: number;
}) {
  const complete = target ? value === target : value > 0;
  return (
    <div data-complete={complete}>
      <dt>{label}</dt>
      <dd>
        {value}
        {target ? <small>/{target}</small> : null}
      </dd>
    </div>
  );
}

function groupContentReviews(reviews: AdminContentReview[]) {
  const groups = new Map<string, ContentReviewGroup>();
  for (const review of reviews) {
    const key = `${review.releaseId}-${review.atomId}-${review.atomVersion}`;
    const current = groups.get(key);
    if (current) {
      current.reviews.push(review);
      if (review.updatedAt > current.updatedAt) {
        current.updatedAt = review.updatedAt;
      }
      continue;
    }
    groups.set(key, {
      atomId: review.atomId,
      atomState: review.atomState,
      atomVersion: review.atomVersion,
      copyShort: review.copyShort,
      entityRef: review.entityRef,
      releaseId: review.releaseId,
      reviews: [review],
      slot: review.slot,
      updatedAt: review.updatedAt,
    });
  }
  return Array.from(groups.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function needsOperatorAttention(group: ContentReviewGroup) {
  const allPassed = reviewRoles.every((role) =>
    group.reviews.some(
      (review) =>
        review.reviewRole === role && review.reviewStatus === "passed",
    ),
  );
  return !allPassed || !["approved", "published"].includes(group.atomState);
}

function releaseDisplayName(release: AdminContentRelease) {
  const match = release.contractVersion.match(/v(\d+(?:\.\d+)?)/i);
  return match ? `성향지도 콘텐츠 v${match[1]}` : "성향지도 콘텐츠";
}

function releaseStatusCopy(release: AdminContentRelease) {
  if (release.status === "published") {
    return {
      description: "현재 고객이 앱에서 보고 있는 성향지도 콘텐츠입니다.",
      title: "고객에게 공개 중이에요",
      tone: "success",
    };
  }
  if (release.status === "approved") {
    return {
      description: "최종 확인 후 ‘고객에게 게시’를 누르면 앱에 적용됩니다.",
      title: "게시할 준비가 끝났어요",
      tone: "brand",
    };
  }
  if (release.status === "in_review") {
    return {
      description: "모든 문구의 네 분야 검토와 콘텐츠 승인을 완료해 주세요.",
      title: "문구 검토를 진행하고 있어요",
      tone: "warning",
    };
  }
  if (release.status === "retired") {
    return {
      description:
        "새 버전으로 교체된 과거 기록이며 고객에게는 보이지 않습니다.",
      title: "이전 게시 버전이에요",
      tone: "neutral",
    };
  }
  return {
    description: "내용 구성을 확인한 뒤 검토를 시작해 주세요.",
    title: "아직 작성 중인 콘텐츠예요",
    tone: "neutral",
  };
}

function releaseLabel(status: string) {
  return (
    {
      approved: "게시 준비 완료",
      draft: "작성 중",
      in_review: "검토 중",
      published: "고객 공개 중",
      retired: "이전 버전",
    }[status] ?? status
  );
}

function releaseTone(status: string) {
  if (status === "published") return "success";
  if (status === "approved") return "brand";
  if (status === "in_review") return "warning";
  return "neutral";
}

function roleLabel(role: string) {
  return (
    {
      measurement: "성향검사 기준",
      plain_language: "누구나 이해하는 문장",
      product_safety: "서비스 안전",
      psychology: "심리학 기준",
    }[role] ?? role
  );
}

function reviewPurpose(role: string) {
  return (
    {
      measurement: "뉴앙 코드가 실제로 측정하는 범위와 맞는지 확인",
      plain_language: "어려운 번역체 없이 바로 이해되는지 확인",
      product_safety: "오해·낙인·과도한 단정이 없는지 확인",
      psychology: "성향 설명과 행동 이유가 타당한지 확인",
    }[role] ?? "내용을 확인"
  );
}

function slotLabel(slot: string) {
  return (
    {
      conversation_prompt: "함께 이야기해 볼 질문",
      daily_life: "일상에서 보이는 모습",
      evidence_note: "설명을 믿을 수 있는 근거",
      facet_breakdown: "세부 성향",
      family: "가족과 함께할 때",
      five_axis_breakdown: "5글자 성향 분석",
      friction: "힘들 수 있는 순간",
      friend: "친구와 함께할 때",
      growth_practice: "더 편안해지는 연습",
      inner_thought: "처음 드는 생각",
      limitation: "해석할 때 알아둘 점",
      measured_definition: "뉴앙 코드가 측정하는 모습",
      not_measured_boundary: "뉴앙 코드가 판단하지 않는 모습",
      observable_response: "실제로 나타나는 반응",
      partner: "연인과 함께할 때",
      person_of_interest: "마음에 드는 사람이 있을 때",
      possible_misread: "다른 사람이 오해하기 쉬운 모습",
      role_name_meaning: "성향 별칭의 뜻",
      strength: "자연스럽게 드러나는 강점",
      summary: "이 성향의 핵심 모습",
      support_preference: "편안하게 느끼는 도움",
      work: "일할 때 보이는 모습",
    }[slot] ?? "성향 설명"
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
