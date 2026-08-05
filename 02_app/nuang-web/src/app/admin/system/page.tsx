import { CheckCircle2, RefreshCw, ServerCog, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  type AdminSystemCheck,
  readAdminSystem,
} from "@/features/admin/server-admin-system";
import betaReleaseCatalog from "../../../../scripts/mvp-go-live-gates.json";
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
  const systemBlockers = allChecks.filter(
    (item) => !item.ok && item.severity === "blocker",
  ).length;
  const gateBlockers = betaReleaseCatalog.gates.filter(
    (gate) => gate.required && gate.status !== "passed",
  ).length;
  const blockers = systemBlockers + gateBlockers;
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
                ? "뉴앙 베타 운영 준비가 완료됐습니다"
                : `출시는 가능하며 ${warnings}개 보완 항목이 있습니다`
              : `베타 출시 전에 ${blockers}개 필수 조건을 해결해야 합니다`}
          </strong>
          <p>
            {blockers === 0
              ? "필수 기능 연결을 확인했습니다."
              : "아래의 ‘출시 필수’ 항목부터 해결해 주세요."}
          </p>
        </div>
      </section>

      <BetaReleaseGates />

      <CheckSection items={data.environment} title="배포 환경" />
      <CheckSection items={data.database} title="데이터·운영 기능" />

      <p className={styles.checkedAt}>
        확인 시각 {formatDateTime(data.generatedAt)}
      </p>
    </main>
  );
}

const betaGateHrefs: Record<string, string> = {
  ai_measurement_prereview: "/admin/research?section=validation",
  external_legal_review: "/admin/legal",
  human_measurement_validation: "/admin/research?section=validation",
  minimum_legal_privacy: "/admin/legal",
  product_value_observability: "/admin/analytics",
  production_oauth: "/admin/system",
  release_candidate: "/admin/system",
  security_privacy: "/admin/system",
};

function BetaReleaseGates() {
  const required = betaReleaseCatalog.gates.filter((gate) => gate.required);
  const passed = required.filter((gate) => gate.status === "passed").length;

  return (
    <section
      aria-labelledby="beta-release-gates-title"
      className={shared.panel}
    >
      <div className={styles.betaGateHeader}>
        <div>
          <span>NUANG BETA · VALUE VALIDATION</span>
          <h2 id="beta-release-gates-title">베타 출시 조건</h2>
          <p>
            AI 사전검토·최소 정책·OAuth·보안·제품 분석·전체 QA는 반드시
            완료합니다. 현재 사람 연구와 외부 법률 검토는 완료나 승인으로 바꾸지
            않고 재검토 조건과 함께 유예했습니다.
          </p>
        </div>
        <strong>
          필수 {passed}/{required.length}
        </strong>
      </div>
      <div className={styles.betaGateList}>
        {betaReleaseCatalog.gates.map((gate) => (
          <article data-status={gate.status} key={gate.id}>
            <div>
              <span>{gate.required ? "베타 필수" : "출시 후 재검토"}</span>
              <h3>{gate.name}</h3>
              <p>
                {gate.status === "deferred"
                  ? gate.revisitTrigger
                  : gate.status === "passed"
                    ? (gate.evidence[gate.evidence.length - 1] ??
                      "기록된 근거를 확인했습니다.")
                    : (gate.requiredEvidence?.[0] ??
                      "기록된 근거를 확인합니다.")}
              </p>
            </div>
            <div className={styles.betaGateAction}>
              <em>{betaGateStatusLabel(gate.id, gate.status)}</em>
              <Link href={betaGateHrefs[gate.id] ?? "/admin/system"}>
                확인하기
              </Link>
            </div>
          </article>
        ))}
      </div>
      <details className={styles.oauthGuide}>
        <summary>Google·Kakao 운영 로그인 완료 기록과 재확인 절차</summary>
        <ol>
          <li>
            <strong>1. 운영 주소 확인</strong>
            <span>
              `https://nuang.app`과 Supabase 운영 callback 주소를 준비합니다.
            </span>
          </li>
          <li>
            <strong>2. 제공자 콘솔 등록</strong>
            <span>
              Google과 Kakao에 운영 도메인·redirect URI·동의 화면을 각각
              등록합니다.
            </span>
          </li>
          <li>
            <strong>3. 실제 계정으로 왕복</strong>
            <span>
              신규 로그인, 기존 계정 연결, 로그아웃, 다시 로그인을 한 번씩
              수행합니다.
            </span>
          </li>
          <li>
            <strong>4. 실패와 정리 확인</strong>
            <span>
              취소·잘못된 callback이 안전하게 끝나는지 보고 시험 계정과 연결
              기록을 정리합니다.
            </span>
          </li>
        </ol>
        <p>
          이 네 단계의 실제 운영 왕복은 완료했습니다. 제공자 콘솔, callback,
          client secret 또는 동의항목을 변경하면 같은 절차를 다시 수행해 증빙을
          갱신하세요.
        </p>
      </details>
      <div className={styles.betaGateFooter}>
        <strong>필수 조건을 모두 완료하면</strong>
        <p>
          자동 배포되는 것이 아니라 최종 출시 후보가 준비됩니다. 전체 QA와 단일
          출시 후보 SHA 확인을 마친 뒤 운영 배포를 승인합니다. 외부 법률 검토와
          사람 측정 검증은 재검토 조건 전까지 계속 유예 상태입니다.
        </p>
      </div>
    </section>
  );
}

function betaGateStatusLabel(id: string, status: string) {
  if (id === "minimum_legal_privacy" && status === "passed") {
    return "베타 내부 기준 완료";
  }
  if (id === "external_legal_review" && status === "deferred") {
    return "외부 승인 아님 · 유예";
  }
  if (id === "human_measurement_validation" && status === "deferred") {
    return "사람 검증 아님 · 유예";
  }
  if (status === "passed") return "완료";
  if (status === "deferred") return "유예 기록됨";
  if (status === "blocked") return "다음 단계 필요";
  return "진행 중";
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
              {!item.ok && item.action ? <small>{item.action}</small> : null}
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
