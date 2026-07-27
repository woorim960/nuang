import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { PolicySkeleton } from "@/features/policy/policy-skeleton";
import styles from "./PolicySkeletonView.module.css";

export function PolicySkeletonView({ policy }: { policy: PolicySkeleton }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="설정으로 돌아가기" href="/my/settings">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <p>{policy.title}</p>
        <span aria-hidden="true" />
      </header>

      <div className={styles.sections}>
        {policy.sections.map((section) => (
          <section className={styles.section} key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
