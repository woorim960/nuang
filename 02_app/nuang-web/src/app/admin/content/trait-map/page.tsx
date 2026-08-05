import {
  Bot,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileSearch,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminTraitMapGuideReviewActions } from "@/features/admin/AdminTraitMapGuideReviewActions";
import shared from "@/features/admin/AdminShared.module.css";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  readAdminTraitMapGuideEditingState,
  readAdminTraitMapGuideHumanReview,
} from "@/features/admin/server-admin-trait-map-guide";
import { TraitMapDetailTemplate } from "@/features/map/EnakqTraitMapTemplate";
import {
  getPublishedTraitMapCustomerGuide,
  getTraitMapBetaAiReleaseSummary,
  getTraitMapBetaAiReviewProfiles,
} from "@/features/nuang-code/trait-map-customer-guide-registry";
import { applyTraitMapGuideTextOverrides } from "@/features/nuang-code/trait-map-guide-text-overrides";
import { reviewTraitMapGuideForBeta } from "@/features/nuang-code/trait-map-guide-review";
import { traitMapGuideReviewRoleCopy } from "@/features/nuang-code/trait-map-guide-review-contract";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "성향지도 문장 검수 | NUANG",
};

const PAGE_SIZE = 12;

export default async function AdminTraitMapGuideReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    chapter?: string;
    code?: string;
    page?: string;
  }>;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const params = await searchParams;
  const profiles = getTraitMapBetaAiReviewProfiles();
  const requestedCode = params.code?.trim().toUpperCase();
  const selectedProfile =
    profiles.find((profile) => profile.profileCode === requestedCode) ??
    profiles[0];
  const baseGuide = getPublishedTraitMapCustomerGuide(
    selectedProfile.profileCode,
  );
  if (!baseGuide) return null;
  const release = getTraitMapBetaAiReleaseSummary();
  const [humanReview, editingState] = await Promise.all([
    readAdminTraitMapGuideHumanReview(context.client, {
      profileCode: baseGuide.code,
      releaseId: release.releaseId,
    }).catch(() => ({
      available: false as const,
      decisions: [],
      deployments: [],
      profiles: [],
    })),
    readAdminTraitMapGuideEditingState(context.client, {
      profileCode: baseGuide.code,
      releaseId: release.releaseId,
    }).catch(() => ({ available: false as const, edits: [] })),
  ]);
  const guide = (() => {
    if (!editingState.available) return baseGuide;
    try {
      return applyTraitMapGuideTextOverrides(baseGuide, editingState.edits);
    } catch {
      return baseGuide;
    }
  })();
  const detailedReview = reviewTraitMapGuideForBeta(guide, {
    includeUnits: true,
  });
  const selectedChapter = normalizeChapter(params.chapter, guide.chapters);
  const chapterUnits =
    detailedReview.units?.filter((unit) =>
      selectedChapter === "hero"
        ? unit.chapterId === null
        : unit.chapterId === selectedChapter,
    ) ?? [];
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const pageCount = Math.max(1, Math.ceil(chapterUnits.length / PAGE_SIZE));
  const page = Math.min(
    pageCount,
    Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
  );
  const visibleUnits = chapterUnits.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const humanDecisionMap = new Map(
    humanReview.decisions.map((decision) => [
      decision.unitKey + "::" + decision.reviewRole,
      decision,
    ]),
  );
  const profileApproval = humanReview.profiles.find(
    (profile) => profile.profileCode === guide.code,
  );
  const approvedHumanDecisionCount = humanReview.decisions.filter(
    (decision) => decision.status === "approved",
  ).length;
  const expectedHumanDecisionCount = detailedReview.unitCount * 7;
  const approvedHumanProfileCount = humanReview.profiles.filter(
    (profile) => profile.status === "approved",
  ).length;
  const sharedTarget = {
    contentDigest: release.contentDigest,
    expectedProfileCount: release.profileCount,
    expectedReleaseUnitCount: release.unitCount,
    expectedUnitCount: detailedReview.unitCount,
    guideVersion: guide.version,
    profileCode: guide.code,
    profileContentDigest: detailedReview.contentDigest,
    releaseId: release.releaseId,
  };

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>32개 성향 · 모든 섹션과 문장</p>
          <h1>성향지도 문장 검수</h1>
        </div>
        <Link href={"/map/" + guide.code} target="_blank">
          고객 화면
          <ExternalLink aria-hidden="true" size={14} strokeWidth={1.8} />
        </Link>
      </header>

      <section className={shared.panel + " " + styles.releaseIntro}>
        <div>
          <span className={styles.releaseEyebrow}>BETA AI REVIEW COMPLETE</span>
          <h2>베타 공개와 MVP 사람 승인을 분리해서 관리해요</h2>
          <p>
            베타는 일곱 전문 역할의 자동 검수를 통과한 32개 상세 지도를
            노출합니다. 이 표시는 사람 전문가가 승인했다는 뜻이 아닙니다. MVP
            사람 검수에서는 아래 원문을 역할별로 직접 읽고 승인해야 해요.
          </p>
        </div>
        <div className={styles.releaseAction}>
          <span>
            사람 승인 프로필
            <strong>{approvedHumanProfileCount} / 32</strong>
          </span>
          <AdminTraitMapGuideReviewActions
            mode="release"
            target={sharedTarget}
          />
        </div>
      </section>

      {!humanReview.available || !editingState.available ? (
        <section className={styles.databaseNotice} role="status">
          <LockKeyhole aria-hidden="true" size={19} strokeWidth={1.8} />
          <div>
            <strong>
              검토·인라인 편집 DB를 연결하면 수정과 승인 기록이 저장됩니다
            </strong>
            <p>
              <code>202608060001_trait_map_sentence_review_operations.sql</code>
              과<code>202608060002_trait_map_inline_content_editing.sql</code>을
              순서대로 적용해 주세요. 저장 전에도 실제 UI와 클릭 편집 동작은
              확인할 수 있어요.
            </p>
          </div>
        </section>
      ) : null}

      <section className={shared.panel + " " + styles.workflow}>
        <div className={shared.panelHeader}>
          <h2>검토부터 배포까지</h2>
          <span>원문이 바뀌면 기존 승인은 자동 무효</span>
        </div>
        <ol>
          {[
            ["전체 재고 확인", "32개·15장·모든 제목과 문장을 빠짐없이 셉니다."],
            [
              "AI 베타 7역할 검수",
              "역할별 기준을 분리해 원문 해시 단위로 검사합니다.",
            ],
            [
              "사람 역할별 검토",
              "같은 문장을 직접 읽고 승인·보류·수정 요청을 남깁니다.",
            ],
            [
              "프로필 최종 승인",
              "모든 문장에 7개 승인이 있어야 최종 승인이 열립니다.",
            ],
            [
              "MVP 검수본 배포",
              "32개 프로필 승인 후에만 사람 검수본을 배포합니다.",
            ],
          ].map(([title, description], index) => (
            <li key={title}>
              <b>{index + 1}</b>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              {index === 1 ? (
                <CheckCircle2 aria-label="완료" size={17} strokeWidth={1.9} />
              ) : (
                <CircleDashed aria-label="진행 전 또는 진행 중" size={17} />
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.metrics} aria-label="성향지도 검수 현황">
        <Metric icon={ShieldCheck} label="AI 승인 프로필" value="32 / 32" />
        <Metric
          icon={FileSearch}
          label="검수 문장 단위"
          value={formatNumber(release.unitCount)}
        />
        <Metric icon={Bot} label="분리 검토 역할" value="7개" />
        <Metric
          icon={Users}
          label={guide.code + " 사람 승인"}
          value={
            formatNumber(approvedHumanDecisionCount) +
            " / " +
            formatNumber(expectedHumanDecisionCount)
          }
        />
      </section>

      <section className={shared.panel + " " + styles.profilePicker}>
        <div className={shared.panelHeader}>
          <h2>32개 프로필</h2>
          <span>선택한 프로필의 모든 장을 검토해요</span>
        </div>
        <div>
          {profiles.map((profile) => {
            const human = humanReview.profiles.find(
              (item) => item.profileCode === profile.profileCode,
            );
            return (
              <Link
                aria-current={
                  profile.profileCode === guide.code ? "page" : undefined
                }
                data-active={profile.profileCode === guide.code}
                href={"/admin/content/trait-map?code=" + profile.profileCode}
                key={profile.profileCode}
              >
                <strong>{profile.profileCode}</strong>
                <small>
                  AI 통과 ·{" "}
                  {human?.status === "approved" ? "사람 승인" : "사람 검토 전"}
                </small>
              </Link>
            );
          })}
        </div>
      </section>

      <div className={styles.reviewLayout}>
        <aside className={shared.panel + " " + styles.chapterPicker}>
          <header>
            <span>{guide.code}</span>
            <strong>{guide.profileName}</strong>
            <small>{detailedReview.unitCount}개 문장 단위</small>
          </header>
          <nav aria-label={guide.code + " 장 선택"}>
            <ChapterLink
              active={selectedChapter === "hero"}
              chapter="hero"
              code={guide.code}
              label="상단 소개"
              number="00"
            />
            {guide.chapters.map((chapter) => (
              <ChapterLink
                active={selectedChapter === chapter.id}
                chapter={chapter.id}
                code={guide.code}
                key={chapter.id}
                label={chapter.label}
                number={String(chapter.number).padStart(2, "0")}
              />
            ))}
          </nav>
        </aside>

        <section className={styles.unitWorkspace}>
          <section
            className={styles.liveEditor}
            aria-labelledby="live-editor-title"
          >
            <header>
              <div>
                <span>LIVE CUSTOMER VIEW</span>
                <h2 id="live-editor-title">보이는 화면에서 바로 고쳐요</h2>
                <p>
                  아래 화면은 고객이 보는 성향지도와 같은 컴포넌트예요. 밑줄이
                  있는 문장을 누르고 수정한 뒤 <b>저장하고 베타 반영</b>을
                  누르면 자동 검수를 거쳐 실제 베타 화면도 같은 문장으로
                  바뀝니다.
                </p>
              </div>
              <div className={styles.liveEditorStatus}>
                <span>현재 수정본</span>
                <strong>{editingState.edits.length}개</strong>
              </div>
            </header>
            <div className={styles.previewViewport}>
              <TraitMapDetailTemplate
                editor={{
                  activeRevisionCount: editingState.edits.length,
                  activeUnitKeys: editingState.edits.map((edit) => edit.unitKey),
                  initialChapterId:
                    selectedChapter === "hero" ? undefined : selectedChapter,
                  releaseId: release.releaseId,
                }}
                embedded
                guide={guide}
              />
            </div>
            <footer>
              <span>점선 밑줄이 있는 제목·요약·본문·질문을 눌러 편집</span>
              <Link href={`/map/${guide.code}`} target="_blank">
                실제 고객 화면에서 확인
                <ExternalLink aria-hidden="true" size={14} strokeWidth={1.8} />
              </Link>
            </footer>
          </section>

          <header className={styles.unitHeader}>
            <div>
              <span>{guide.version}</span>
              <h2>{chapterTitle(selectedChapter, guide.chapters)}</h2>
              <p>
                위 실제 화면에서 문장을 직접 고치거나, 아래에서 문장을 한 개씩
                읽고 역할별 판단 근거와 사람 승인 상태를 확인하세요. 수정된
                문장은 새 해시로 저장되므로 이전 사람 승인은 재사용되지
                않습니다.
              </p>
            </div>
            <span className={shared.status} data-tone="success">
              AI 7역할 통과
            </span>
          </header>

          <div className={styles.unitList}>
            {visibleUnits.map((unit, index) => (
              <article className={styles.unitCard} key={unit.unitKey}>
                <header>
                  <span>
                    {String((page - 1) * PAGE_SIZE + index + 1).padStart(
                      2,
                      "0",
                    )}
                  </span>
                  <div>
                    <strong>{unitKindLabel(unit.kind)}</strong>
                    <small>
                      {unit.sectionTitle ?? unit.chapterLabel ?? "상단 소개"} ·
                      해시 {unit.contentHash}
                    </small>
                  </div>
                  <em className={shared.status} data-tone="success">
                    AI 승인
                  </em>
                </header>
                <blockquote>{unit.text}</blockquote>
                <div className={styles.trace}>
                  <span>근거 {unit.evidenceRefs.length}개 연결</span>
                  <span>원문 위치 {unit.unitKey}</span>
                </div>
                <div className={styles.roleReviews}>
                  {unit.reviewDecisions.map((decision) => {
                    const role = traitMapGuideReviewRoleCopy[decision.role];
                    const humanDecision = humanDecisionMap.get(
                      unit.unitKey + "::" + decision.role,
                    );
                    return (
                      <details key={decision.role}>
                        <summary>
                          <span>
                            <strong>{role.label}</strong>
                            <small>{role.purpose}</small>
                          </span>
                          <em
                            className={shared.status}
                            data-tone={humanStatusTone(humanDecision?.status)}
                          >
                            {humanStatusLabel(humanDecision?.status)}
                          </em>
                        </summary>
                        <div>
                          <p>
                            <b>AI 베타 판단</b> 통과 · 점수 {decision.score}/4
                          </p>
                          <p>{decision.rationale}</p>
                          {humanDecision?.note ? (
                            <p>
                              <b>사람 메모</b> {humanDecision.note}
                            </p>
                          ) : null}
                          <AdminTraitMapGuideReviewActions
                            currentStatus={humanDecision?.status}
                            mode="unit"
                            target={{
                              ...sharedTarget,
                              contentHash: unit.contentHash,
                              reviewRole: decision.role,
                              unitKey: unit.unitKey,
                            }}
                          />
                        </div>
                      </details>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          <nav aria-label="문장 목록 페이지" className={styles.pagination}>
            {page <= 1 ? (
              <span aria-disabled="true">이전</span>
            ) : (
              <Link href={reviewHref(guide.code, selectedChapter, page - 1)}>
                이전
              </Link>
            )}
            <b>
              {page} / {pageCount}
            </b>
            {page >= pageCount ? (
              <span aria-disabled="true">다음</span>
            ) : (
              <Link href={reviewHref(guide.code, selectedChapter, page + 1)}>
                다음
              </Link>
            )}
          </nav>

          <section className={styles.profileApproval}>
            <div>
              <strong>{guide.code} 사람 최종 승인</strong>
              <p>
                {formatNumber(approvedHumanDecisionCount)} /{" "}
                {formatNumber(expectedHumanDecisionCount)}개 역할 승인이
                완료됐어요. 전부 완료되기 전에는 최종 승인이 거절됩니다.
              </p>
            </div>
            <AdminTraitMapGuideReviewActions
              currentStatus={profileApproval?.status}
              mode="profile"
              target={sharedTarget}
            />
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <article>
      <span>
        <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function ChapterLink({
  active,
  chapter,
  code,
  label,
  number,
}: {
  active: boolean;
  chapter: string;
  code: string;
  label: string;
  number: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      data-active={active}
      href={reviewHref(code, chapter, 1)}
    >
      <span>{number}</span>
      {label}
    </Link>
  );
}

function normalizeChapter(
  chapter: string | undefined,
  chapters: Array<{ id: string }>,
) {
  if (chapter === "hero") return "hero";
  return chapters.some((item) => item.id === chapter)
    ? (chapter as string)
    : (chapters[0]?.id ?? "hero");
}

function chapterTitle(
  chapter: string,
  chapters: Array<{ id: string; label: string; title: string }>,
) {
  if (chapter === "hero") return "상단 소개";
  const found = chapters.find((item) => item.id === chapter);
  return found ? found.label + " · " + found.title : "문장 검수";
}

function reviewHref(code: string, chapter: string, page: number) {
  return (
    "/admin/content/trait-map?code=" +
    code +
    "&chapter=" +
    chapter +
    "&page=" +
    Math.max(1, page)
  );
}

function unitKindLabel(kind: string) {
  return (
    {
      chapter_summary: "장 요약",
      chapter_title: "장 제목",
      check_question: "확인 질문",
      hero_summary: "상단 소개 문장",
      paragraph_sentence: "본문 문장",
      reference_description: "근거 설명",
      reference_title: "근거 제목",
      section_title: "섹션 제목",
    }[kind] ?? kind
  );
}

function humanStatusLabel(status?: string) {
  if (status === "approved") return "사람 승인";
  if (status === "changes_requested") return "수정 요청";
  if (status === "hold") return "보류";
  return "사람 검토 전";
}

function humanStatusTone(status?: string) {
  if (status === "approved") return "success";
  if (status === "changes_requested") return "danger";
  if (status === "hold") return "warning";
  return "brand";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
