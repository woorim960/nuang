import { AlertTriangle, LockKeyhole, RefreshCcw, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import type { PublicComparisonAccessStatus } from "@/features/together/public-comparison-lookup-contract";

const unavailableCopy: Record<
  Exclude<PublicComparisonAccessStatus, "active">,
  {
    action: string;
    body: string;
    icon: typeof AlertTriangle;
    statusLabel: string;
    title: string;
  }
> = {
  stale: {
    action: "상대 공개 범위를 다시 확인한 뒤 새 비교를 만들어 주세요.",
    body:
      "상대의 공개 범위가 바뀌어 이전 리포트를 그대로 열 수 없어요.",
    icon: RefreshCcw,
    statusLabel: "재확인 필요",
    title: "비교 리포트를 다시 확인해야 해요",
  },
  disabled: {
    action: "설정에서 공개 범위 조건을 확인해 주세요.",
    body:
      "현재 공개 범위 안에서 이 비교 리포트를 열 수 없어요. 비공개 항목은 추정하지 않습니다.",
    icon: LockKeyhole,
    statusLabel: "접근 중단",
    title: "현재 열 수 없는 비교 리포트예요",
  },
  deleted: {
    action: "필요하면 상대 프로필에서 다시 비교를 시작해 주세요.",
    body:
      "삭제된 비교 리포트는 다시 열 수 없어요. 삭제된 결과나 공개 범위를 복원한다고 안내하지 않습니다.",
    icon: Trash2,
    statusLabel: "삭제됨",
    title: "삭제된 비교 리포트예요",
  },
};

const safetyLines = [
  "직접 응답·원점수 미공개",
  "민감 항목 추정 없음",
  "궁합 점수 없음",
] as const;

export function isPublicComparisonBlockedStatus(
  status: string,
): status is Exclude<PublicComparisonAccessStatus, "active"> {
  return status === "stale" || status === "disabled" || status === "deleted";
}

export function PublicComparisonUnavailable({
  status,
}: {
  status: Exclude<PublicComparisonAccessStatus, "active">;
}) {
  const copy = unavailableCopy[status];
  const Icon = copy.icon;

  return (
    <section className="grid gap-5">
      <header className="text-center">
        <Icon aria-hidden="true" className="mx-auto text-primary" size={28} />
        <div className="mt-5 flex justify-center">
          <StatusPill tone={status === "stale" ? "caution" : "neutral"}>
            {copy.statusLabel}
          </StatusPill>
        </div>
        <h1 className="mt-4 text-2xl font-black">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{copy.body}</p>
      </header>

      <div className="border-y border-line py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} />
          <div>
            <h2 className="font-bold">다음 행동</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{copy.action}</p>
          </div>
        </div>
        <div className="mt-4 grid divide-y divide-line text-sm font-semibold text-muted">
          {safetyLines.map((line) => (
            <p className="py-2 first:pt-0 last:pb-0" key={line}>
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <ButtonLink href="/my/reports">내 리포트로</ButtonLink>
        <ButtonLink href="/my/settings/visibility" variant="secondary">
          공개 범위 설정
        </ButtonLink>
      </div>
    </section>
  );
}
