import { CheckCircle2, RefreshCw, ServerCog, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  type AdminSystemCheck,
  readAdminSystem,
} from "@/features/admin/server-admin-system";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "시스템 상태 | NUANG",
};

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const data = await readAdminSystem(context.client);
  const allChecks = [...data.environment, ...data.database];
  const blockers = allChecks.filter(
    (item) => !item.ok && item.severity === "blocker",
  ).length;
  const warnings = allChecks.filter(
    (item) => !item.ok && item.severity === "warning",
  ).length;

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>설정과 데이터 연결</p>
          <h1>시스템</h1>
        </div>
        <Link className={shared.headerAction} href="/admin/system">
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.7} />
          다시 확인
        </Link>
      </header>

      <section className={styles.health} data-ok={blockers === 0}>
        <span>
          <ServerCog aria-hidden="true" size={22} strokeWidth={1.7} />
        </span>
        <div>
          <strong>
            {blockers === 0
              ? warnings === 0
                ? "MVP 운영 준비가 완료됐습니다"
                : `출시는 가능하며 ${warnings}개 보완 항목이 있습니다`
              : `출시 전에 ${blockers}개 필수 항목을 해결해야 합니다`}
          </strong>
          <p>
            {blockers === 0
              ? "필수 기능 연결을 확인했습니다."
              : "아래의 ‘출시 필수’ 항목부터 해결해 주세요."}
          </p>
        </div>
      </section>

      <CheckSection items={data.environment} title="배포 환경" />
      <CheckSection items={data.database} title="데이터·운영 기능" />

      <p className={styles.checkedAt}>
        확인 시각 {formatDateTime(data.generatedAt)}
      </p>
    </main>
  );
}

function CheckSection({
  items,
  title,
}: {
  items: AdminSystemCheck[];
  title: string;
}) {
  return (
    <section className={shared.panel}>
      <div className={shared.panelHeader}>
        <h2>{title}</h2>
        <span>
          {items.filter((item) => item.ok).length}/{items.length} 정상
        </span>
      </div>
      <div className={styles.checkList}>
        {items.map((item) => (
          <div data-ok={item.ok} key={item.key}>
            {item.ok ? (
              <CheckCircle2 aria-hidden="true" size={19} strokeWidth={1.7} />
            ) : (
              <XCircle aria-hidden="true" size={19} strokeWidth={1.7} />
            )}
            <div>
              <span className={styles.checkCopy}>
                <strong>{item.label}</strong>
                {!item.ok ? (
                  <em data-severity={item.severity}>
                    {item.severity === "blocker" ? "출시 필수" : "운영 보완"}
                  </em>
                ) : null}
              </span>
              <span>{item.detail}</span>
              {!item.ok && item.action ? (
                <small>{item.action}</small>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
