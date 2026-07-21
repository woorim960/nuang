import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MyTraitDetailView } from "@/features/account/MyTraitDetailView";
import styles from "./page.module.css";

export default function MyProfileDetailPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="마이로 돌아가기" href="/my">
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
        <p>내 성향 상세</p>
        <span aria-hidden="true" />
      </header>

      <MyTraitDetailView />
    </main>
  );
}
