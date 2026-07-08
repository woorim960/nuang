import { KeyRound, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

export const publicProfileCodeExample = "NUANG-A7K2M9";

const policyLines = [
  "사용자별 unique 코드",
  "대표 성향 코드와 별도",
  "중복 확인과 변경 기록 후 발급",
] as const;

export function PublicProfileCodeIssuePreview() {
  const closedState = createApiClosedPayload(
    "public_profile_code_issue_db_write_pending",
  );

  return (
    <section aria-labelledby="public-profile-code-title" className="grid gap-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          <KeyRound aria-hidden="true" size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <StatusPill tone="primary">공개 코드 준비</StatusPill>
          <h2 className="mt-2 text-base font-bold" id="public-profile-code-title">
            내 공개 프로필 코드를 만들 준비 중이에요
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            공개 프로필 링크와 1:1 비교에 쓰는 사용자별 코드예요. `FOAMT`
            같은 대표 성향 코드는 공개 코드로 쓰지 않아요.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted">예시 형식</p>
            <p className="mt-1 font-mono text-xl font-black text-ink">
              {publicProfileCodeExample}
            </p>
          </div>
          <StatusPill tone="neutral">아직 미발급</StatusPill>
        </div>
        <div className="mt-3 grid gap-2">
          {policyLines.map((line) => (
            <div
              className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm font-semibold text-muted"
              key={line}
            >
              <ShieldCheck
                aria-hidden="true"
                className="shrink-0 text-success"
                size={16}
              />
              <span>{line}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
          {closedState.display.message} {closedState.display.nextStep}
        </p>
        <button
          aria-label="공개 프로필 코드 발급 준비 중"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-surface-soft px-4 text-sm font-bold text-muted disabled:cursor-not-allowed disabled:opacity-80"
          disabled
          type="button"
        >
          서버 연결 후 코드 발급
        </button>
      </div>
    </section>
  );
}
