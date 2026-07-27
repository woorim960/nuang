import { ArrowLeft, AtSign, FileText, Flag, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminMemberActions } from "@/features/admin/AdminMemberActions";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminMemberDetail } from "@/features/admin/server-admin-members";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "회원 상세 | NUANG",
};

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const member = await readAdminMemberDetail({
    accountId,
    client: context.client,
  }).catch(() => null);
  if (!member) notFound();

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div className={styles.title}>
          <Link aria-label="회원 목록으로 돌아가기" href="/admin/members">
            <ArrowLeft aria-hidden="true" size={19} strokeWidth={1.7} />
          </Link>
          <div>
            <p>회원 상세</p>
            <h1>{member.displayName}</h1>
          </div>
        </div>
        <em
          className={shared.status}
          data-tone={member.accountStatus === "active" ? "success" : "danger"}
        >
          {member.accountStatus === "active" ? "이용 중" : "이용 정지"}
        </em>
      </header>

      <section className={`${shared.panel} ${styles.profile}`}>
        <span className={styles.avatar}>{member.displayName.slice(0, 1)}</span>
        <div>
          <strong>{member.displayName}</strong>
          <p>
            <AtSign aria-hidden="true" size={14} strokeWidth={1.7} />
            {member.handle}
          </p>
          {member.bio ? <small>{member.bio}</small> : null}
        </div>
        {member.code ? <em>{member.code}</em> : null}
      </section>

      <section aria-label="회원 활동 요약" className={styles.metrics}>
        <div>
          <MessageSquareText aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>게시물</span>
          <strong>{member.postCount}</strong>
        </div>
        <div>
          <FileText aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>리포트</span>
          <strong>{member.resultCount}</strong>
        </div>
        <div>
          <Flag aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>신고</span>
          <strong>{member.reportCount}</strong>
        </div>
      </section>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>계정 상태</h2>
          <span>민감 정보는 상태만 확인</span>
        </div>
        <dl className={styles.details}>
          <div>
            <dt>로그인</dt>
            <dd>{providerLabel(member.provider)}</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd>{contactLabel(member.contact.email)}</dd>
          </div>
          <div>
            <dt>휴대전화</dt>
            <dd>{contactLabel(member.contact.mobile)}</dd>
          </div>
          <div>
            <dt>코드 공개</dt>
            <dd>{member.visibility.code === "public" ? "공개" : "비공개"}</dd>
          </div>
          <div>
            <dt>비교 기능</dt>
            <dd>{member.comparisonEnabled ? "허용" : "사용 안 함"}</dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd>{formatDate(member.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <AdminMemberActions
        accountId={member.accountId}
        accountStatus={member.accountStatus}
        profileStatus={member.profileStatus}
      />
    </main>
  );
}

function contactLabel(status: string) {
  if (status === "verified") return "인증 완료";
  if (status === "unverified") return "미인증";
  return "미등록";
}

function providerLabel(provider: string | null) {
  return (
    { email: "이메일", google: "구글", kakao: "카카오", naver: "네이버" }[
      provider ?? ""
    ] ?? "확인 불가"
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
