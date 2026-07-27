import { Download, Search, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminAudit } from "@/features/admin/server-admin-audit";
import {
  adminActionLabel,
  adminTargetLabel,
} from "@/features/admin/admin-operation-copy";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "운영 기록 | NUANG",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const query = (await searchParams).q?.slice(0, 100) ?? "";
  const items = await readAdminAudit({ client: context.client, query }).catch(
    () => null,
  );

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>누가 무엇을 바꿨는지</p>
          <h1>운영 기록</h1>
        </div>
        <a className={shared.headerAction} href="/api/admin/audit/export">
          <Download aria-hidden="true" size={16} strokeWidth={1.7} />
          CSV
        </a>
      </header>

      <section className={`${shared.panel} ${styles.filters}`}>
        <form action="/admin/audit">
          <Search aria-hidden="true" size={18} strokeWidth={1.7} />
          <input
            aria-label="운영 기록 검색"
            defaultValue={query}
            name="q"
            placeholder="조치, 대상 또는 관리자"
          />
          <button type="submit">검색</button>
        </form>
      </section>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>최근 조치</h2>
          <span>{items?.length ?? 0}건</span>
        </div>
        {!items ? (
          <div className={shared.error}>
            <strong>운영 기록을 불러오지 못했습니다</strong>
            <p>audit 스키마와 서비스 역할 연결을 확인해 주세요.</p>
          </div>
        ) : items.length === 0 ? (
          <div className={shared.empty}>
            <ShieldCheck aria-hidden="true" size={22} strokeWidth={1.7} />
            <strong>조건에 맞는 기록이 없습니다</strong>
            <p>검색어를 바꾸거나 첫 관리자 조치를 진행해 보세요.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <article key={item.id}>
                <span aria-hidden="true" />
                <div>
                  <header>
                    <strong>{adminActionLabel(item.action)}</strong>
                    <time dateTime={item.createdAt}>
                      {formatDateTime(item.createdAt)}
                    </time>
                  </header>
                  <p>
                    {item.adminName}
                    {item.targetTable
                      ? ` · ${adminTargetLabel(item.targetTable)}`
                      : ""}
                  </p>
                  {Object.keys(item.metadata).length > 0 ? (
                    <details>
                      <summary>기록 정보</summary>
                      <pre>{formatMetadata(item.metadata)}</pre>
                    </details>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatMetadata(metadata: Record<string, unknown>) {
  return Object.entries(metadata)
    .filter(([key]) => !/phone|email|cipher|token|secret/i.test(key))
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
