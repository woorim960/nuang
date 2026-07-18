import { FileSearch, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

const reportShellSafetyLines = [
  "내가 만든 리포트만 조회",
  "공개 범위 다시 확인",
  "비공개 추정 없음",
] as const;

export function PublicComparisonReportShell({
  comparisonReportId,
}: {
  comparisonReportId: string | null;
}) {
  const closedState = createApiClosedPayload("public_comparison_lookup_pending");
  const validReference = Boolean(comparisonReportId);

  return (
    <section className="grid gap-5">
      <header className="text-center">
        <FileSearch aria-hidden="true" className="mx-auto text-primary" size={28} />
        <div className="mt-5 flex justify-center">
          <StatusPill tone={validReference ? "primary" : "caution"}>
            {validReference ? "조회 준비 중" : "형식 확인 필요"}
          </StatusPill>
        </div>
        <h1 className="mt-4 text-2xl font-black">
          아직 비교 리포트를 열 수 없어요
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {validReference
            ? "비교 리포트 조회 서버가 연결되기 전까지는 임의 결과를 보여주지 않아요."
            : "비교 리포트 링크 형식을 확인해 주세요."}
        </p>
      </header>

      <div className="border-y border-line py-4">
        <p className="text-xs font-semibold text-muted">비교 링크</p>
        <p className="mt-1 break-all font-mono text-sm font-bold text-ink">
          {comparisonReportId ?? "유효하지 않은 비교 링크"}
        </p>
      </div>

      <div className="border-b border-line pb-4">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} />
          <div>
            <h2 className="font-bold">{closedState.display.message}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {closedState.display.nextStep}
            </p>
          </div>
        </div>
        <div className="mt-4 grid divide-y divide-line text-sm font-semibold text-muted">
          {reportShellSafetyLines.map((line) => (
            <p className="py-2 first:pt-0 last:pb-0" key={line}>
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <ButtonLink href="/my/reports" variant="secondary">
          내 리포트로
        </ButtonLink>
        <ButtonLink href="/my/settings/visibility">공개 범위 설정</ButtonLink>
      </div>
    </section>
  );
}
