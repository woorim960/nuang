import { ArrowLeft, ChevronRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthMethodsPanel } from "@/features/account/AuthMethodsPanel";
import { PrivateContactEditor } from "@/features/account/PrivateContactEditor";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "로그인 및 보안 | NUANG",
};

export default function AccountSettingsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="설정으로 돌아가기" href="/my/settings">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <h1>로그인 및 보안</h1>
        <span aria-hidden="true" />
      </header>

      <AuthMethodsPanel />

      <PrivateContactEditor />

      <section className={styles.protectionNote}>
        <span aria-hidden="true">
          <ShieldCheck size={18} strokeWidth={1.8} />
        </span>
        <div>
          <strong>내 정보는 공개되지 않아요</strong>
          <p>
            로그인 이메일과 복구 연락처는 프로필이나 커뮤니티에 표시되지
            않아요.
          </p>
        </div>
      </section>

      <Link className={styles.deleteLink} href="/my/settings/account/delete">
        <span>
          <strong>계정 삭제</strong>
          <small>프로필과 모든 뉴앙 기록을 삭제합니다</small>
        </span>
        <ChevronRight aria-hidden="true" size={17} strokeWidth={1.7} />
      </Link>
    </main>
  );
}
