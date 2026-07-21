import {
  ArrowLeft,
  ChevronRight,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";
import styles from "./page.module.css";

const privacyItems = [
  {
    description: "다른 사람에게 보이는 프로필과 비교 정보",
    href: "/my/settings/visibility",
    icon: LockKeyhole,
    title: "공개 정보 안내",
  },
] as const;

const serviceItems = [
  {
    description: "뉴앙 서비스 이용 기준",
    href: "/policies/terms",
    icon: FileCheck2,
    title: "이용약관",
  },
  {
    description: "개인정보를 수집하고 보호하는 방법",
    href: "/policies/privacy",
    icon: ShieldCheck,
    title: "개인정보 처리방침",
  },
] as const;

export default function MySettingsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="마이로 돌아가기" href="/my">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <p>설정</p>
        <span aria-hidden="true" />
      </header>

      <section className={styles.intro}>
        <h1>내 계정과 공개 정보를 관리해요</h1>
        <p>현재 사용할 수 있는 설정만 모아 한눈에 확인할 수 있어요.</p>
      </section>

      <SettingsSection title="계정">
        <div className={styles.accountPanel}>
          <AccountConnectPanel />
        </div>
      </SettingsSection>

      <SettingsSection title="개인정보와 커뮤니티">
        <SettingsList items={privacyItems} />
      </SettingsSection>

      <SettingsSection title="서비스 정보">
        <SettingsList items={serviceItems} />
      </SettingsSection>

      <p className={styles.safetyNote}>
        검사 답변과 원점수, 계정 정보는 다른 사람에게 공개되지 않아요.
      </p>
    </main>
  );
}

function SettingsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function SettingsList({
  items,
}: {
  items: ReadonlyArray<{
    description: string;
    href: string;
    icon: typeof LockKeyhole;
    title: string;
  }>;
}) {
  return (
    <nav className={styles.list}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link href={item.href} key={item.title}>
            <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <ChevronRight aria-hidden="true" size={17} strokeWidth={1.7} />
          </Link>
        );
      })}
    </nav>
  );
}
