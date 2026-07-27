import { Link2, MessageSquareWarning, Rows3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminCommunityActions } from "@/features/admin/AdminCommunityActions";
import { AdminCommunityContentManager } from "@/features/admin/AdminCommunityContentManager";
import { AdminExternalLinkReview } from "@/features/admin/AdminExternalLinkReview";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminCommunity } from "@/features/admin/server-admin-community";
import {
  readAdminCommunityContent,
  type AdminCommunityContentType,
} from "@/features/admin/server-admin-community-content";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "커뮤니티 운영 | NUANG",
};

export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const requestedView = (await searchParams).view;
  const view = isCommunityView(requestedView) ? requestedView : "reports";
  const [data, contentDashboard] = await Promise.all([
    readAdminCommunity(context.client).catch(() => null),
    readAdminCommunityContent(context.client).catch(() => null),
  ]);
  const contentType = viewToContentType(view);
  const visibleCount =
    view === "reports"
      ? (data?.reports.length ?? 0)
      : view === "posts"
        ? (data?.posts.length ?? 0)
        : view === "links"
          ? (data?.links.length ?? 0)
        : (contentDashboard?.items.filter(
            (item) => item.contentType === contentType,
          ).length ?? 0);

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>신고와 공개 상태</p>
          <h1>커뮤니티</h1>
        </div>
        <span className={shared.headerAction}>
          {view === "reports" ? (
            <MessageSquareWarning
              aria-hidden="true"
              size={17}
              strokeWidth={1.7}
            />
          ) : view === "links" ? (
            <Link2 aria-hidden="true" size={17} strokeWidth={1.7} />
          ) : (
            <Rows3 aria-hidden="true" size={17} strokeWidth={1.7} />
          )}
          {visibleCount}건
        </span>
      </header>

      <nav aria-label="커뮤니티 운영 구분" className={styles.tabs}>
        <Link
          aria-current={view === "reports" ? "page" : undefined}
          data-active={view === "reports"}
          href="/admin/community?view=reports"
        >
          신고
          <span>{data?.reports.length ?? 0}</span>
        </Link>
        <Link
          aria-current={view === "links" ? "page" : undefined}
          data-active={view === "links"}
          href="/admin/community?view=links"
        >
          링크 검토
          <span>{data?.links.length ?? 0}</span>
        </Link>
        <Link
          aria-current={view === "posts" ? "page" : undefined}
          data-active={view === "posts"}
          href="/admin/community?view=posts"
        >
          게시물
          <span>{data?.posts.length ?? 0}</span>
        </Link>
        <Link
          aria-current={view === "balance" ? "page" : undefined}
          data-active={view === "balance"}
          href="/admin/community?view=balance"
        >
          밸런스게임
          <span>
            {contentDashboard?.items.filter(
              (item) => item.contentType === "balance_game",
            ).length ?? 0}
          </span>
        </Link>
        <Link
          aria-current={view === "questions" ? "page" : undefined}
          data-active={view === "questions"}
          href="/admin/community?view=questions"
        >
          오늘의 질문
          <span>
            {contentDashboard?.items.filter(
              (item) => item.contentType === "daily_question",
            ).length ?? 0}
          </span>
        </Link>
      </nav>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>{sectionTitle(view)}</h2>
          <span>{sectionMeta(view)}</span>
        </div>
        {contentType ? (
          contentDashboard ? (
            <AdminCommunityContentManager
              contentType={contentType}
              dashboard={contentDashboard}
            />
          ) : (
            <div className={shared.error}>
              <strong>운영 콘텐츠 저장소를 불러오지 못했습니다</strong>
              <p>
                관리자 커뮤니티 콘텐츠 마이그레이션 적용 상태를 확인해 주세요.
              </p>
            </div>
          )
        ) : !data ? (
          <div className={shared.error}>
            <strong>커뮤니티 운영 정보를 불러오지 못했습니다</strong>
            <p>feed 스키마 연결과 관리자 권한을 확인해 주세요.</p>
          </div>
        ) : view === "links" ? (
          !data.linkReviewAvailable ? (
            <div className={shared.error}>
              <strong>링크 안전 저장소를 준비해야 합니다</strong>
              <p>외부 링크 안전 마이그레이션을 적용한 뒤 다시 확인해 주세요.</p>
            </div>
          ) : data.links.length > 0 ? (
            <AdminExternalLinkReview links={data.links} />
          ) : (
            <div className={shared.empty}>
              <strong>확인할 외부 링크가 없습니다</strong>
              <p>처음 보는 도메인이 게시되면 이곳에 표시됩니다.</p>
            </div>
          )
        ) : view === "reports" ? (
          !data.contentReportAvailable ? (
            <div className={shared.error}>
              <strong>콘텐츠 신고 저장소를 준비해야 합니다</strong>
              <p>커뮤니티 안전 마이그레이션을 적용한 뒤 다시 확인해 주세요.</p>
            </div>
          ) : data.reports.length > 0 ? (
            <div className={styles.list}>
              {data.reports.map((report) => (
                <article key={report.id}>
                  <header>
                    <div>
                      <strong>{report.targetName}</strong>
                      <span>
                        {report.targetType === "profile"
                          ? "프로필"
                          : report.targetType === "comment"
                            ? "댓글"
                            : "게시물"}{" "}
                        · 신고자 {report.reporterName}
                      </span>
                    </div>
                    <em
                      className={shared.status}
                      data-tone={
                        report.severity === "high"
                          ? "danger"
                          : report.severity === "medium"
                            ? "warning"
                            : "brand"
                      }
                    >
                      {reasonLabel(report.reason)}
                    </em>
                  </header>
                  {report.contentPreview ? (
                    <p>{report.contentPreview}</p>
                  ) : null}
                  {report.details ? <p>{report.details}</p> : null}
                  <small>
                    {statusLabel(report.status)} ·{" "}
                    {formatDateTime(report.createdAt)}
                  </small>
                  <AdminCommunityActions
                    id={report.id}
                    kind={
                      report.kind === "content"
                        ? "content_report"
                        : "profile_report"
                    }
                    status={report.status}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className={shared.empty}>
              <strong>검토할 신고가 없습니다</strong>
              <p>신규 신고가 접수되면 이곳에 표시됩니다.</p>
            </div>
          )
        ) : data.posts.length > 0 ? (
          <div className={styles.list}>
            {data.posts.map((post) => (
              <article key={post.id}>
                <header>
                  <div>
                    <strong>{post.authorName}</strong>
                    <span>{sourceLabel(post.source)}</span>
                  </div>
                  <em
                    className={shared.status}
                    data-tone={
                      post.moderationStatus === "limited" ? "warning" : "brand"
                    }
                  >
                    {post.moderationStatus === "limited"
                      ? "노출 제한"
                      : "검토 대기"}
                  </em>
                </header>
                <p>{post.body || "사진 중심 게시물"}</p>
                <small>{formatDateTime(post.createdAt)}</small>
                <AdminCommunityActions
                  id={post.id}
                  kind="post"
                  status={post.moderationStatus}
                />
              </article>
            ))}
          </div>
        ) : (
          <div className={shared.empty}>
            <strong>검토할 게시물이 없습니다</strong>
            <p>대기 또는 노출 제한 게시물이 생기면 이곳에 표시됩니다.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function reasonLabel(reason: string) {
  return (
    {
      harassment: "괴롭힘",
      fraud: "사기·금전 피해",
      hate: "혐오 표현",
      other: "기타",
      privacy: "개인정보",
      self_harm: "자해 위험",
      sexual_content: "성적 콘텐츠",
      sensitive_content: "민감 콘텐츠",
      spam: "스팸",
      violence: "폭력·위험 행동",
    }[reason] ?? "신고"
  );
}

function statusLabel(status: string) {
  if (status === "in_review") return "검토 중";
  if (status === "action_required") return "조치 필요";
  return "접수";
}

function sourceLabel(source: string) {
  return (
    {
      ask_nuang: "뉴앙에게 물어봐",
      balance_game: "밸런스게임",
      daily_question: "오늘의 질문",
      free_text: "자유 게시물",
      report_share: "리포트 공유",
    }[source] ?? "게시물"
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

type CommunityView =
  | "balance"
  | "links"
  | "posts"
  | "questions"
  | "reports";

function isCommunityView(value: string | undefined): value is CommunityView {
  return ["balance", "links", "posts", "questions", "reports"].includes(
    value ?? "",
  );
}

function viewToContentType(
  view: CommunityView,
): AdminCommunityContentType | null {
  if (view === "balance") return "balance_game";
  if (view === "questions") return "daily_question";
  return null;
}

function sectionTitle(view: CommunityView) {
  if (view === "reports") return "신고 대기열";
  if (view === "posts") return "게시물 상태";
  if (view === "links") return "외부 링크 확인";
  if (view === "balance") return "밸런스게임";
  return "오늘의 질문";
}

function sectionMeta(view: CommunityView) {
  if (view === "reports") return "접수 순";
  if (view === "posts") return "최근 작성 순";
  if (view === "links") return "확인 대기 순";
  return "임시저장부터 게시까지";
}
