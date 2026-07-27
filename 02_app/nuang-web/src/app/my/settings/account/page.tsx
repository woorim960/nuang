import { ArrowLeft, ChevronRight, ShieldCheck } from "lucide-react";
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

      <section className={styles.accountSection}>
        <AccountConnectPanel />
      </section>

      <section className={styles.protectionNote}>
        <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.7} />
        <p>
          로그인 계정의 이메일과 식별 정보는 커뮤니티 프로필에 표시되지 않아요.
        </p>
      </section>

      <Link className={styles.deleteLink} href="/my/settings/account/delete">
        <span>계정 삭제</span>
        <ChevronRight aria-hidden="true" size={17} strokeWidth={1.7} />
      </Link>
    </main>
  );
}
