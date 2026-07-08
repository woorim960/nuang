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
      "상대의 공개 범위나 공개 프로필 스냅샷이 바뀌어 이전 리포트를 그대로 열 수 없어요.",
    icon: RefreshCcw,
    statusLabel: "재확인 필요",
    title: "비교 리포트를 다시 확인해야 해요",
  },
  disabled: {
    action: "함께 탭에서 공개 범위 조건을 확인해 주세요.",
    body:
      "현재 공개 범위 안에서 이 비교 리포트를 열 수 없어요. 비공개 항목은 추정하지 않습니다.",
    icon: LockKeyhole,
    statusLabel: "접근 중단",
    title: "현재 열 수 없는 비교 리포트예요",
  },
  deleted: {
    action: "필요하면 새로운 공개 프로필 코드로 다시 비교해 주세요.",
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
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-surface-soft text-primary">
          <Icon aria-hidden="true" size={24} />
        </div>
        <div className="mt-5 flex justify-center">
          <StatusPill tone={status === "stale" ? "caution" : "neutral"}>
            {copy.statusLabel}
          </StatusPill>
        </div>
        <h1 className="mt-4 text-2xl font-black">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{copy.body}</p>
      </header>

      <div className="rounded-lg border border-line bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <AlertTriangle aria-hidden="true" size={18} />
          </div>
          <div>
            <h2 className="font-bold">다음 행동</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{copy.action}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {safetyLines.map((line) => (
            <span
              className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-semibold text-muted"
              key={line}
            >
              {line}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <ButtonLink href="/together">함께 탭으로</ButtonLink>
        <ButtonLink href="/together/comparison-preview" variant="secondary">
          리포트 구성 보기
        </ButtonLink>
      </div>
    </section>
  );
}
