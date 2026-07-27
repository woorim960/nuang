import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountDeletionPanel } from "@/features/account/AccountDeletionPanel";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "계정 삭제 | NUANG",
};

export default function DeleteAccountPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="로그인 계정으로 돌아가기" href="/my/settings/account">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <p>계정 삭제</p>
        <span aria-hidden="true" />
      </header>
      <AccountDeletionPanel />
    </main>
  );
}
