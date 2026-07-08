"use client";

import {
  AlertCircle,
  EyeOff,
  Flag,
  LoaderCircle,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  communitySafetyActionTargetOptions,
  communitySafetyActionLabels,
  communitySafetyActionTypes,
  communitySafetyTargetSelectEventName,
  type CommunitySafetyAction,
  type CommunitySafetyTargetOption,
} from "@/features/community/safety-action-contract";
import {
  createApiClosedPayload,
  type ApiClosedPayload,
} from "@/lib/api/closed-state-data";

type SafetyActionState =
  | {
      action: CommunitySafetyAction | null;
      kind: "idle";
      message: string;
      nextStep: string;
    }
  | {
      action: CommunitySafetyAction;
      kind: "pending";
      message: string;
      nextStep: string;
    }
  | {
      action: CommunitySafetyAction;
      code: string;
      kind: "closed";
      message: string;
      nextStep: string;
    }
  | {
      action: CommunitySafetyAction;
      kind: "error";
      message: string;
      nextStep: string;
    };

const initialClosed = createApiClosedPayload(
  "community_safety_action_db_write_pending",
);

export function CommunitySafetyActionPanel() {
  const [selectedTarget, setSelectedTarget] = useState<CommunitySafetyTargetOption>(
    communitySafetyActionTargetOptions[0],
  );
  const [state, setState] = useState<SafetyActionState>({
    action: null,
    kind: "idle",
    message: initialClosed.display.message,
    nextStep: initialClosed.display.nextStep,
  });
  const isPending = state.kind === "pending";
  const isPresetTarget = communitySafetyActionTargetOptions.some(
    (target) => target.id === selectedTarget.id,
  );

  useEffect(() => {
    function handleTargetSelect(event: Event) {
      const detail = (event as CustomEvent<CommunitySafetyTargetOption>).detail;

      if (!detail?.id || !detail.type || !detail.label) return;
      setSelectedTarget(detail);
    }

    window.addEventListener(
      communitySafetyTargetSelectEventName,
      handleTargetSelect,
    );

    return () => {
      window.removeEventListener(
        communitySafetyTargetSelectEventName,
        handleTargetSelect,
      );
    };
  }, []);

  const statusTone = useMemo(() => {
    if (state.kind === "closed" || state.kind === "pending") return "caution";
    if (state.kind === "error") return "neutral";

    return "primary";
  }, [state.kind]);

  async function submitAction(action: CommunitySafetyAction) {
    setState({
      action,
      kind: "pending",
      message: `${selectedTarget.label} ${communitySafetyActionLabels[action].label} 요청을 확인하고 있어요.`,
      nextStep: "서버가 어떤 조건에서 기능을 닫고 있는지 확인합니다.",
    });

    try {
      const response = await fetch("/api/community-safety-actions", {
        body: JSON.stringify(buildSafetyActionRequest(action, selectedTarget)),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json()) as Partial<ApiClosedPayload> & {
        error?: string;
        message?: string;
      };

      if (body.error === "feature_closed" && body.display) {
        setState({
          action,
          code: body.code ?? "feature_closed",
          kind: "closed",
          message: body.display.message,
          nextStep: body.display.nextStep,
        });
        return;
      }

      setState({
        action,
        kind: "error",
        message: body.message ?? "요청 상태를 확인하지 못했어요.",
        nextStep: "커뮤니티 보호 액션은 실제 저장 전까지 안전하게 닫힌 상태로 둡니다.",
      });
    } catch {
      setState({
        action,
        kind: "error",
        message: "네트워크 상태 때문에 요청을 확인하지 못했어요.",
        nextStep: "현재 커뮤니티 글쓰기와 댓글은 닫혀 있어 안전하게 유지됩니다.",
      });
    }
  }

  return (
    <div
      className="mt-5 rounded-lg border border-line bg-white p-4"
      id="community-safety-actions"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <StatusPill tone="neutral">보호 액션</StatusPill>
          <h3 className="mt-2 font-bold">신고·숨김·차단 준비 확인</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            실제 커뮤니티를 열기 전에 보호 액션이 어떤 서버 상태로 막히는지 먼저
            확인할 수 있어요.
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface-soft text-success">
          <ShieldCheck aria-hidden="true" size={19} />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <p className="text-xs font-bold text-muted">대상 선택</p>
        <div className="grid gap-2">
          {communitySafetyActionTargetOptions.map((target) => {
            const isSelected = target.id === selectedTarget.id;

            return (
              <button
                aria-label={`${target.label} 대상 선택: ${target.description}`}
                aria-pressed={isSelected}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm font-bold ${
                  isSelected
                    ? "border-primary bg-surface-soft text-primary"
                    : "border-line bg-white text-muted"
                }`}
                disabled={isPending}
                key={target.id}
                onClick={() => setSelectedTarget(target)}
                type="button"
              >
                <span>{target.label}</span>
                <span className="truncate text-xs font-semibold">
                  {target.description}
                </span>
              </button>
            );
          })}
        </div>
        {!isPresetTarget && (
          <div className="rounded-lg border border-primary/30 bg-surface-soft px-3 py-2">
            <p className="text-xs font-bold text-primary">피드 카드에서 선택됨</p>
            <p className="mt-1 text-sm font-bold">{selectedTarget.label}</p>
            <p className="mt-1 text-xs font-semibold text-muted">
              {selectedTarget.description}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {communitySafetyActionTypes.map((action) => {
          const label = communitySafetyActionLabels[action];

          return (
            <Button
              aria-label={`${label.label} 보호 액션 준비 확인`}
              className="grid min-h-20 place-items-center px-2 py-3 text-center text-xs"
              disabled={isPending}
              icon={getActionIcon(action, isPending && state.action === action)}
              key={action}
              onClick={() => void submitAction(action)}
              variant="secondary"
            >
              {label.label} 준비
            </Button>
          );
        })}
      </div>

      <SafetyActionInlineAlert state={state} statusTone={statusTone} />
    </div>
  );
}

function SafetyActionInlineAlert({
  state,
  statusTone,
}: {
  state: SafetyActionState;
  statusTone: "caution" | "neutral" | "primary";
}) {
  return (
    <div
      aria-live="polite"
      className="mt-4 rounded-lg border border-primary/20 bg-surface-soft p-3"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-primary">
          {state.kind === "pending" ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
          ) : state.kind === "error" ? (
            <AlertCircle aria-hidden="true" size={17} />
          ) : (
            <ShieldCheck aria-hidden="true" size={17} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={statusTone}>
              {state.kind === "idle"
                ? "대기"
                : state.kind === "pending"
                  ? "확인 중"
                  : state.kind === "closed"
                    ? "닫힘 확인"
                    : "확인 실패"}
            </StatusPill>
            {state.kind === "closed" && (
              <span className="break-all text-xs font-bold text-muted">
                {state.code}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-bold">{state.message}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{state.nextStep}</p>
        </div>
      </div>
    </div>
  );
}

function buildSafetyActionRequest(
  action: CommunitySafetyAction,
  target: CommunitySafetyTargetOption,
) {
  return {
    action,
    reason: action === "report" ? "privacy" : undefined,
    target: {
      id: target.id,
      type: target.type,
    },
  };
}

function getActionIcon(action: CommunitySafetyAction, isPending: boolean) {
  if (isPending) {
    return <LoaderCircle aria-hidden="true" className="mb-2 animate-spin" size={18} />;
  }

  if (action === "report") {
    return <Flag aria-hidden="true" className="mb-2 text-[#9a6400]" size={18} />;
  }

  if (action === "hide") {
    return <EyeOff aria-hidden="true" className="mb-2 text-primary" size={18} />;
  }

  return <UserX aria-hidden="true" className="mb-2 text-[#d83a31]" size={18} />;
}
