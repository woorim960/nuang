import {
  ArrowRight,
  FileCheck2,
  PauseCircle,
  Scale,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminLegalReviewWorkspace } from "@/features/admin/AdminLegalReviewWorkspace";
import shared from "@/features/admin/AdminShared.module.css";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readAdminLegalDashboard } from "@/features/admin/server-admin-legal";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "법률·정책 검토 | NUANG",
};

export default async function AdminLegalPage() {
  const context = await resolveAdminContext();
  if (!context.ok) return null;

  const dashboard = await readAdminLegalDashboard(context.client);

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>거버넌스 · 출시 후 재검토</p>
          <h1>법률·정책 검토</h1>
        </div>
        <Link className={shared.headerAction} href="/admin/consents">
          <Users aria-hidden="true" size={15} strokeWidth={1.8} />
          회원 동의 현황
        </Link>
      </header>

      <section
        aria-label="법률 검토 화면 사용 안내"
        className={styles.introGrid}
      >
        <article className={styles.betaNotice}>
          <PauseCircle aria-hidden="true" size={19} strokeWidth={1.7} />
          <div>
            <strong>
              NUANG Beta는 외부 법률 검토를 유예했습니다 · 승인 아님
            </strong>
            <p>
              현재 베타의 최소 정책·코드 내부 대조는 완료했습니다. 아래 6단계는
              베타 배포 전 필수 작업이 아니며, 유료화·실제 광고 본운영·만 14세
              미만 가입·정식 공개 확대 중 가장 이른 시점 전에 진행하세요. 내부
              완료 기록을 변호사 승인으로 바꾸면 안 됩니다.
            </p>
          </div>
        </article>
        <article>
          <Scale aria-hidden="true" size={19} strokeWidth={1.7} />
          <div>
            <strong>이곳에서는 문서와 실제 기능을 함께 검토합니다</strong>
            <p>
              약관·개인정보 처리방침의 문구만 읽는 것이 아니라 가입, 검사,
              커뮤니티, 공유, 삭제, 연구와 OAuth 동작의 증빙을 항목별로
              연결합니다.
            </p>
          </div>
        </article>
        <article>
          <FileCheck2 aria-hidden="true" size={19} strokeWidth={1.7} />
          <div>
            <strong>회원 동의 현황과는 별도 기록입니다</strong>
            <p>
              동의 관리는 회원이 선택한 상태를 조회하는 화면입니다. 여기서는
              내부 책임자와 외부 검토자가 출시 문서의 적정성을 검토하고 승인
              근거를 남깁니다.
            </p>
            <Link href="/admin/consents">
              동의 관리로 이동
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
        </article>
      </section>

      <AdminLegalReviewWorkspace dashboard={dashboard} />
    </main>
  );
}
