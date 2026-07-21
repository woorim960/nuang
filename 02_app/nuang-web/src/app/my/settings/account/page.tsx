import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "로그인 계정 | NUANG",
};

export default function AccountSettingsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="설정으로 돌아가기" href="/my/settings">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <p>로그인 계정</p>
        <span aria-hidden="true" />
      </header>

      <section className={styles.intro}>
        <h1>내 활동을 이어갈 계정을 관리해요</h1>
        <p>
          로그인하면 검사 결과와 게시물, 팔로우 기록을 같은 계정에서 이어볼 수
          있어요.
        </p>
      </section>

      <section className={styles.accountSection}>
        <AccountConnectPanel />
      </section>

      <section className={styles.protectionNote}>
        <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.7} />
        <p>
          로그인 계정의 이메일과 식별 정보는 커뮤니티 프로필에 표시되지 않아요.
        </p>
      </section>
    </main>
  );
}
