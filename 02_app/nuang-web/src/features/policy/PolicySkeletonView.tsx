import { ArrowLeft, ShieldCheck } from "lucide-react";
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

      <section className={styles.intro}>
        <div>
          <h1>{policy.title}</h1>
          <p>{policy.summary}</p>
        </div>
        <span className={styles.shield}>
          <ShieldCheck aria-hidden="true" size={23} strokeWidth={1.7} />
        </span>
      </section>

      <p className={styles.guide}>{policy.guide}</p>

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
