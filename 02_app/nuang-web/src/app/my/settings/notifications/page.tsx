import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPreferenceEditor } from "@/features/account/MarketingPreferenceEditor";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "알림 및 마케팅 | NUANG",
};

export default function NotificationSettingsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="설정으로 돌아가기" href="/my/settings">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <h1>알림 및 마케팅</h1>
        <span aria-hidden="true" />
      </header>
      <MarketingPreferenceEditor />
    </main>
  );
}
