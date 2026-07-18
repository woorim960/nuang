import Image from "next/image";
import { ShieldCheck } from "lucide-react";

type AssessmentMidpointCheckpointProps = {
  isSaving: boolean;
  onContinue: () => void;
  onDefer: () => void;
};

export function AssessmentMidpointCheckpoint({
  isSaving,
  onContinue,
  onDefer,
}: AssessmentMidpointCheckpointProps) {
  return (
    <section
      aria-labelledby="assessment-midpoint-title"
      className="flex flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col items-center px-5 pb-6 pt-8 text-center">
        <div aria-hidden="true" className="nuang-checkpoint-visual relative">
          <span className="nuang-checkpoint-glow absolute inset-4 rounded-full bg-surface-soft" />
          <Image
            alt=""
            className="nuang-checkpoint-mascot relative h-24 w-24 object-contain min-[360px]:h-28 min-[360px]:w-28"
            height={112}
            priority
            src="/assets/assessment/nuang-checkpoint-mascot-v1.webp"
            width={112}
          />
          <span className="nuang-checkpoint-shadow absolute bottom-1 left-1/2 h-2 w-14 -translate-x-1/2 rounded-full bg-foreground/10" />
        </div>

        <h1
          className="mt-5 text-2xl font-bold tracking-[-0.025em] text-foreground"
          id="assessment-midpoint-title"
        >
          절반까지 답했어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          <span className="block">바로 이어가거나,</span>
          <span className="block">잠시 쉬었다가 계속해도 괜찮아요.</span>
        </p>

        <div className="mt-6 w-full rounded-2xl bg-surface-soft px-4 py-4 text-sm font-semibold leading-6 text-foreground">
          <p aria-label="최근 6개월 동안 반복된 평소 모습을 떠올려 주세요.">
            <span aria-hidden="true" className="block">
              최근 6개월 동안 반복된
            </span>
            <span aria-hidden="true" className="block">
              평소 모습을 떠올려 주세요.
            </span>
          </p>
        </div>

        <p className="mt-5 text-sm leading-6 text-muted">
          <span className="block">
            검사를 마치면{" "}
            <strong className="font-bold text-foreground">
              다섯 글자 뉴앙 코드
            </strong>
            와
          </span>
          <span className="block">
            나를 더 자세히 설명하는 리포트가 열려요.
          </span>
        </p>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-background/95 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[488px] gap-2">
          <button
            className="min-h-14 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isSaving}
            onClick={onDefer}
            type="button"
          >
            홈에서 이어하기
          </button>
          <button
            className="min-h-14 rounded-xl bg-foreground px-4 text-sm font-semibold text-surface transition-transform active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isSaving}
            onClick={onContinue}
            type="button"
          >
            {isSaving ? "보관하고 있어요" : "계속 답하기"}
          </button>
        </div>
        <p className="mx-auto mt-3 flex max-w-[488px] items-start justify-center gap-2 text-center text-xs leading-5 text-muted">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={15}
          />
          <span>
            지금까지 답한 내용은 이 기기에서 7일 동안 이어볼 수 있어요.
          </span>
        </p>
      </div>
    </section>
  );
}
