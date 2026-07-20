import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LocalResultManager } from "@/features/account/LocalResultManager";
import styles from "./page.module.css";

export default function MyReportsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="마이로 돌아가기" href="/my">
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
        <p>내 리포트</p>
        <span aria-hidden="true" />
      </header>

      <section className={styles.intro}>
        <p>MY REPORTS</p>
        <h1>발견한 내 모습을 다시 만나보세요</h1>
        <p>
          성향 검사 결과와 원하는 사람과의 비교 리포트를 한곳에서 편하게 확인할
          수 있어요.
        </p>
      </section>

      <LocalResultManager />
    </main>
  );
}
