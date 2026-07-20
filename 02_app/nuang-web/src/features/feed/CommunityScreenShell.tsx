import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./CommunitySecondaryScreen.module.css";

export function CommunityScreenShell({
  backLabel = "커뮤니티로 돌아가기",
  backHref = "/feed",
  children,
  title,
  trailing,
}: {
  backLabel?: string;
  backHref?: string;
  children: ReactNode;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <main className={styles.screen}>
      <header className={styles.screenHeader}>
        <Link aria-label={backLabel} href={backHref}>
          <ArrowLeft aria-hidden="true" size={24} strokeWidth={2} />
        </Link>
        <h1>{title}</h1>
        <span className={styles.trailing}>{trailing}</span>
      </header>
      <div className={styles.screenBody}>{children}</div>
    </main>
  );
}
