import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LocalResultManager } from "@/features/account/LocalResultManager";
import styles from "../page.module.css";

export default function MyReportHistoryPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="내 기록 개요로 돌아가기" href="/my?tab=reports">
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
        <p>지난 결과</p>
        <span aria-hidden="true" />
      </header>

      <LocalResultManager />
    </main>
  );
}
