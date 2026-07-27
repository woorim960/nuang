import { Search, UserRoundCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  readAdminMembers,
  type AdminMemberSummary,
} from "@/features/admin/server-admin-members";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "회원 운영 | NUANG",
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const params = await searchParams;
  const query = params.q?.slice(0, 80) ?? "";
  const status = ["active", "suspended", "deleted"].includes(
    params.status ?? "",
  )
    ? (params.status as string)
    : "all";
  let members: AdminMemberSummary[] = [];
  let unavailable = false;
  try {
    members = await readAdminMembers({
      client: context.client,
      query,
      status,
    });
  } catch {
    unavailable = true;
  }

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>계정과 공개 프로필</p>
          <h1>회원</h1>
        </div>
        <span className={shared.headerAction}>
          <UserRoundCheck aria-hidden="true" size={17} strokeWidth={1.7} />
          {members.length}명
        </span>
      </header>

      <section className={`${shared.panel} ${styles.filters}`}>
        <form action="/admin/members" className={styles.search}>
          <Search aria-hidden="true" size={18} strokeWidth={1.7} />
          <input
            aria-label="회원 검색"
            defaultValue={query}
            name="q"
            placeholder="이름, 아이디 또는 계정 ID"
          />
          {status !== "all" ? (
            <input name="status" type="hidden" value={status} />
          ) : null}
          <button type="submit">검색</button>
        </form>
        <nav aria-label="회원 상태">
          {[
            ["all", "전체"],
            ["active", "이용 중"],
            ["suspended", "이용 정지"],
          ].map(([value, label]) => (
            <Link
              aria-current={status === value ? "page" : undefined}
              data-active={status === value}
              href={`/admin/members?status=${value}${
                query ? `&q=${encodeURIComponent(query)}` : ""
              }`}
              key={value}
            >
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>회원 목록</h2>
          <span>연락처 원문은 표시하지 않습니다</span>
        </div>
        {unavailable ? (
          <div className={shared.error}>
            <strong>회원 정보를 불러오지 못했습니다</strong>
            <p>Supabase 연결과 identity/profile 스키마를 확인해 주세요.</p>
          </div>
        ) : members.length === 0 ? (
          <div className={shared.empty}>
            <strong>조건에 맞는 회원이 없습니다</strong>
            <p>검색어나 상태 필터를 바꿔 보세요.</p>
          </div>
        ) : (
          <div className={styles.list}>
            <div aria-hidden="true" className={styles.tableHead}>
              <span>회원</span>
              <span>계정 상태</span>
            </div>
            {members.map((member) => (
              <Link href={`/admin/members/${member.accountId}`} key={member.accountId}>
                <span className={styles.avatar}>
                  {member.displayName.slice(0, 1)}
                </span>
                <div className={styles.memberCopy}>
                  <div>
                    <strong>{member.displayName}</strong>
                    {member.code ? <em>{member.code}</em> : null}
                  </div>
                  <p>@{member.handle}</p>
                  <small>
                    게시물 {member.postCount} · 신고 {member.reportCount} ·{" "}
                    {providerLabel(member.provider)}
                  </small>
                </div>
                <div className={styles.memberStatus}>
                  <em
                    className={shared.status}
                    data-tone={accountTone(member.accountStatus)}
                  >
                    {accountLabel(member.accountStatus)}
                  </em>
                  <small>
                    이메일 {contactLabel(member.contact.email)}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function providerLabel(provider: string | null) {
  return (
    {
      email: "이메일 로그인",
      google: "구글",
      kakao: "카카오",
      naver: "네이버",
    }[provider ?? ""] ?? "로그인 정보 없음"
  );
}

function contactLabel(status: string) {
  if (status === "verified") return "인증";
  if (status === "unverified") return "미인증";
  return "미등록";
}

function accountLabel(status: string) {
  if (status === "suspended") return "이용 정지";
  if (status === "deleted") return "탈퇴";
  return "이용 중";
}

function accountTone(status: string) {
  if (status === "suspended") return "danger";
  if (status === "deleted") return "warning";
  return "success";
}
