"use client";

import {
  BookOpenText,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./AdminShell.module.css";

const navigation = [
  {
    label: "서비스 운영",
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "운영 개요" },
      { href: "/admin/members", icon: Users, label: "회원 관리" },
      { href: "/admin/community", icon: MessagesSquare, label: "커뮤니티" },
      { href: "/admin/events", icon: ClipboardList, label: "이벤트" },
    ],
  },
  {
    label: "품질 관리",
    items: [
      { href: "/admin/research", icon: FlaskConical, label: "검사 연구" },
      { href: "/admin/content", icon: BookOpenText, label: "성향 콘텐츠" },
    ],
  },
  {
    label: "운영 설정",
    items: [
      { href: "/admin/audit", icon: ShieldCheck, label: "운영 기록" },
      { href: "/admin/system", icon: Settings2, label: "시스템 상태" },
    ],
  },
] as const;

export function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <header className={styles.mobileHeader}>
        <Link aria-label="마이로 돌아가기" href="/my">
          <LogOut aria-hidden="true" size={19} strokeWidth={1.7} />
        </Link>
        <div>
          <span>NUANG</span>
          <strong>운영 센터</strong>
        </div>
        <span className={styles.mobileShield}>
          <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.7} />
        </span>
      </header>

      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <Gauge aria-hidden="true" size={20} strokeWidth={1.8} />
          </span>
          <div>
            <span>NUANG</span>
            <strong>운영 센터</strong>
          </div>
        </div>
        <div className={styles.adminIdentity}>
          <span>
            <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.7} />
          </span>
          <div>
            <strong>관리자</strong>
            <small>{adminEmail}</small>
          </div>
        </div>
        <AdminNavigation pathname={pathname} />
        <Link className={styles.backToApp} href="/my">
          <LogOut aria-hidden="true" size={18} strokeWidth={1.7} />
          앱으로 돌아가기
        </Link>
      </aside>

      <div className={styles.mobileNav}>
        <details className={styles.mobileMenu}>
          <summary>
            <strong>{currentSection(pathname)}</strong>
            <span>
              전체 메뉴
              <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
            </span>
          </summary>
          <AdminNavigation pathname={pathname} />
        </details>
      </div>

      <section className={styles.workspace}>
        <header className={styles.desktopHeader}>
          <div>
            <span>NUANG OPERATIONS</span>
            <strong>{currentSection(pathname)}</strong>
          </div>
          <div className={styles.desktopHeaderActions}>
            <span className={styles.liveStatus}>
              <i aria-hidden="true" />
              관리자 인증됨
            </span>
            <Link href="/my">서비스 화면</Link>
          </div>
        </header>
        <div className={styles.main}>{children}</div>
      </section>
    </div>
  );
}

function AdminNavigation({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="관리자 메뉴" className={styles.navigation}>
      {navigation.map((group) => (
        <div className={styles.navGroup} key={group.label}>
          <small>{group.label}</small>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                data-active={active}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={1.65} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function currentSection(pathname: string) {
  for (const group of navigation) {
    for (const item of group.items) {
      const active =
        item.href === "/admin"
          ? pathname === item.href
          : pathname.startsWith(item.href);
      if (active) return item.label;
    }
  }
  return "운영 센터";
}
