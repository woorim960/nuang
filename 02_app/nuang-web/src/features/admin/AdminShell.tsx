"use client";

import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminCommandMenu } from "./AdminCommandMenu";
import { adminNavigation, resolveAdminNavigation } from "./admin-navigation";
import styles from "./AdminShell.module.css";

export function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = resolveAdminNavigation(pathname);

  return (
    <div className={styles.shell}>
      <header className={styles.mobileHeader}>
        <Link aria-label="마이로 돌아가기" href="/my">
          <LogOut aria-hidden="true" size={19} strokeWidth={1.7} />
        </Link>
        <div>
          <strong>NUANG</strong>
          <span>OPERATIONS</span>
        </div>
        <span className={styles.mobileShield}>
          <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.7} />
        </span>
      </header>

      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>N</span>
          <div>
            <strong>NUANG</strong>
            <span>OPERATIONS CONSOLE</span>
          </div>
        </div>
        <div className={styles.adminIdentity}>
          <span>
            <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.7} />
          </span>
          <div>
            <small>AUTHENTICATED OPERATOR</small>
            <small>{adminEmail}</small>
          </div>
        </div>
        <div className={styles.sidebarNavigationScroll}>
          <AdminNavigation pathname={pathname} />
        </div>
        <footer className={styles.sidebarFooter}>
          <span>ADMIN PLATFORM V3</span>
          <Link className={styles.backToApp} href="/my">
            <LogOut aria-hidden="true" size={17} strokeWidth={1.7} />
            서비스 화면으로 이동
          </Link>
        </footer>
      </aside>

      <div className={styles.mobileNav}>
        <details className={styles.mobileMenu}>
          <summary>
            <strong>{current.label}</strong>
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
          <div className={styles.breadcrumb}>
            <span>{current.groupLabel}</span>
            <ChevronRight aria-hidden="true" size={14} strokeWidth={1.8} />
            <strong>{current.label}</strong>
          </div>
          <div className={styles.desktopHeaderActions}>
            <AdminCommandMenu pathname={pathname} />
            <span className={styles.liveStatus}>
              <i aria-hidden="true" />
              보안 세션 활성
            </span>
            <Link href="/my">
              서비스 화면
              <ExternalLink aria-hidden="true" size={14} strokeWidth={1.8} />
            </Link>
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
      {adminNavigation.map((group) => (
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
