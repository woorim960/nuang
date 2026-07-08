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
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-surface-soft text-primary">
          <FileSearch aria-hidden="true" size={24} />
        </div>
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
            : "비교 리포트 링크 형식을 확인해 주세요. 유효한 리포트 ID가 필요합니다."}
        </p>
      </header>

      <div className="rounded-lg border border-line bg-white p-4">
        <p className="text-xs font-semibold text-muted">리포트 ID</p>
        <p className="mt-1 break-all font-mono text-sm font-bold text-ink">
          {comparisonReportId ?? "유효하지 않은 리포트 ID"}
        </p>
      </div>

      <div className="rounded-lg border border-primary/20 bg-surface-soft p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-primary">
            <ShieldCheck aria-hidden="true" size={18} />
          </div>
          <div>
            <h2 className="font-bold">{closedState.display.message}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {closedState.display.nextStep}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {reportShellSafetyLines.map((line) => (
            <span
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-muted"
              key={line}
            >
              {line}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <ButtonLink href="/together/comparison-preview" variant="secondary">
          리포트 구성 보기
        </ButtonLink>
        <ButtonLink href="/together">함께 탭으로</ButtonLink>
      </div>
    </section>
  );
}
