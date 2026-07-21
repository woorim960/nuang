import {
  ArrowLeft,
  Ban,
  ChevronRight,
  FileCheck2,
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
    description: "사진, 닉네임과 프로필 메시지를 바꿔요",
    href: "/my/profile/edit",
    icon: UserRoundPen,
    title: "프로필 편집",
  },
  {
    description: "프로필에 보이는 성향과 비교 허용 범위를 정해요",
    href: "/my/settings/visibility",
    icon: LockKeyhole,
    title: "공개 정보",
  },
] as const;

const accountItems = [
  {
    description: "로그인한 계정과 로그아웃을 관리해요",
    href: "/my/settings/account",
    icon: KeyRound,
    title: "로그인 계정",
  },
  {
    description: "내 커뮤니티에서 보이지 않게 한 프로필을 확인해요",
    href: "/my/settings/blocked",
    icon: Ban,
    title: "차단한 프로필",
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
        <span>내가 정하는 뉴앙</span>
        <h1>프로필과 계정을 편하게 관리해요</h1>
        <p>지금 바로 바꿀 수 있는 설정만 모았어요.</p>
      </section>

      <SettingsSection title="프로필">
        <SettingsList items={profileItems} />
      </SettingsSection>

      <SettingsSection title="계정과 안전">
        <SettingsList items={accountItems} />
      </SettingsSection>

      <SettingsSection title="서비스 정보">
        <SettingsList items={serviceItems} />
      </SettingsSection>

      <p className={styles.safetyNote}>
        문항별 답변과 원점수, 로그인 정보는 항상 나만 볼 수 있어요.
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
