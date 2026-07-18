import {
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { LocalPersistStatus } from "@/features/assessment/types";
import { cn } from "@/lib/utils/cn";

type VisiblePersistStatus = Extract<
  LocalPersistStatus,
  "failed" | "saving" | "saved"
>;

type AssessmentRecoveryOverlayProps = {
  aboveTallDock?: boolean;
  kind?: "answer" | "progress";
  onRetry: () => void;
  status: VisiblePersistStatus;
};

const recoveryCopy = {
  failed: {
    title: ["선택한 답을 아직", "보관하지 못했어요"],
    detail: ["답은 화면에 그대로 있어요.", "다시 시도하면 계속할 수 있어요."],
  },
  saving: {
    title: ["선택한 답을", "보관하고 있어요"],
    detail: ["화면의 선택은 그대로 유지돼요.", "잠시만 기다려 주세요."],
  },
  saved: {
    title: ["선택한 답을", "보관했어요"],
    detail: ["안전하게 보관했어요.", "이제 계속해서 답할 수 있어요."],
  },
} as const;

const progressRecoveryCopy = {
  failed: {
    title: ["진행 위치를 아직", "보관하지 못했어요"],
    detail: ["현재 화면은 그대로예요.", "다시 시도하면 계속할 수 있어요."],
  },
  saving: {
    title: ["진행 위치를", "보관하고 있어요"],
    detail: ["현재 화면은 그대로 유지돼요.", "잠시만 기다려 주세요."],
  },
  saved: {
    title: ["진행 위치를", "보관했어요"],
    detail: ["안전하게 보관했어요.", "이제 계속해서 답할 수 있어요."],
  },
} as const;

export function AssessmentRecoveryOverlay({
  aboveTallDock = false,
  kind = "answer",
  onRetry,
  status,
}: AssessmentRecoveryOverlayProps) {
  const copy =
    kind === "progress" ? progressRecoveryCopy[status] : recoveryCopy[status];
  const isSaving = status === "saving";
  const isSaved = status === "saved";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[79px] z-40 px-4 pb-3 min-[360px]:bottom-[81px]",
        aboveTallDock && "bottom-[174px] min-[360px]:bottom-[174px]",
      )}
    >
      <section
        aria-atomic="true"
        aria-live="assertive"
        className={cn(
          "nuang-recovery-card relative mx-auto max-w-[488px] overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-[0_-12px_32px_rgb(32_34_50_/_12%)]",
          isSaved && "bg-[#f2faf6]",
        )}
        role="alert"
      >
        {isSaving ? (
          <span className="nuang-recovery-progress absolute inset-x-0 top-0 h-0.5 origin-left bg-primary" />
        ) : null}
        <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-3 min-[360px]:grid-cols-[36px_minmax(0,1fr)_auto]">
          <span
            aria-hidden="true"
            className={cn(
              "grid h-9 w-9 self-start place-items-center rounded-full bg-[#fff1ee] text-danger",
              isSaving && "bg-surface-soft text-primary",
              isSaved && "nuang-recovery-success bg-[#e4f5ec] text-success",
            )}
          >
            {isSaving ? (
              <LoaderCircle className="nuang-saving-spinner" size={18} />
            ) : isSaved ? (
              <ShieldCheck size={18} />
            ) : (
              <ShieldAlert size={18} />
            )}
          </span>

          <div className="min-w-0">
            <p
              aria-label={copy.title.join(" ")}
              className="text-sm font-semibold leading-5 text-foreground"
            >
              <span aria-hidden="true" className="block min-[430px]:inline">
                {copy.title[0]}
              </span>{" "}
              <span aria-hidden="true" className="block min-[430px]:inline">
                {copy.title[1]}
              </span>
            </p>
            <p
              aria-label={copy.detail.join(" ")}
              className="mt-1 text-xs leading-5 text-muted"
            >
              <span aria-hidden="true" className="block min-[430px]:inline">
                {copy.detail[0]}
              </span>{" "}
              <span aria-hidden="true" className="block min-[430px]:inline">
                {copy.detail[1]}
              </span>
            </p>
          </div>

          <button
            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-foreground min-[360px]:col-span-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving || isSaved}
            onClick={onRetry}
            type="button"
          >
            {isSaving ? (
              <LoaderCircle
                aria-hidden="true"
                className="nuang-saving-spinner"
                size={17}
              />
            ) : isSaved ? (
              <ShieldCheck aria-hidden="true" size={17} />
            ) : (
              <RotateCcw aria-hidden="true" size={17} />
            )}
            {isSaving ? "보관하는 중" : isSaved ? "완료" : "다시 시도"}
          </button>
        </div>
      </section>
    </div>
  );
}
