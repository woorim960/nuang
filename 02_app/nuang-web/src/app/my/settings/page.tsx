import {
  ArrowLeft,
  Ban,
  ChevronRight,
  FileCheck2,
  Gift,
  Handshake,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRoundPen,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./page.module.css";

const profileItems = [
  {
    href: "/my/profile/edit",
    icon: UserRoundPen,
    title: "프로필 편집",
  },
  {
    href: "/my/settings/visibility",
    icon: LockKeyhole,
    title: "공개 정보",
  },
] as const;

const accountItems = [
  {
    href: "/my/events",
    icon: Gift,
    title: "참여한 이벤트",
  },
  {
    href: "/my/settings/account",
    icon: KeyRound,
    title: "로그인 계정",
  },
  {
    href: "/my/settings/blocked",
    icon: Ban,
    title: "차단한 프로필",
  },
] as const;

const serviceItems = [
  {
    href: "/advertise",
    icon: Handshake,
    title: "광고·제휴 문의",
  },
  {
    href: "/policies/terms",
    icon: FileCheck2,
    title: "이용약관",
  },
  {
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

      <SettingsSection title="프로필">
        <SettingsList items={profileItems} />
      </SettingsSection>

      <SettingsSection title="계정과 안전">
        <SettingsList items={accountItems} />
      </SettingsSection>

      <SettingsSection title="서비스 정보">
        <SettingsList items={serviceItems} />
      </SettingsSection>
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
            </span>
            <ChevronRight aria-hidden="true" size={17} strokeWidth={1.7} />
          </Link>
        );
      })}
    </nav>
  );
}
