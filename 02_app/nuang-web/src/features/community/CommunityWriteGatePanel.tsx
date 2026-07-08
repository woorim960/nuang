"use client";

import { LockKeyhole, MessageCircleWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  communityWriteGateSelectEventName,
  getCommunityWriteGateOption,
  type CommunityWriteGateSelection,
} from "@/features/community/community-write-gate";
import type { ApiClosedPayload } from "@/lib/api/closed-state-data";

type WriteProbeState =
  | { status: "idle" }
  | { status: "pending" }
  | {
      blockedBy: string[];
      message: string;
      nextStep: string;
      status: "closed";
    }
  | { message: string; status: "error" };

export function CommunityWriteGatePanel() {
  const [selected, setSelected] = useState<CommunityWriteGateSelection>({
    cardTitle: "커뮤니티 피드",
    kind: "post",
  });
  const [probe, setProbe] = useState<WriteProbeState>({ status: "idle" });
  const option = getCommunityWriteGateOption(selected.kind);

  useEffect(() => {
    function handleGateSelect(event: Event) {
      const detail = (event as CustomEvent<CommunityWriteGateSelection>).detail;

      if (!detail?.kind || !detail.cardTitle) return;
      setSelected(detail);
      void submitWriteProbe(detail);
    }

    window.addEventListener(communityWriteGateSelectEventName, handleGateSelect);

    return () => {
      window.removeEventListener(
        communityWriteGateSelectEventName,
        handleGateSelect,
      );
    };
  }, []);

  return (
    <section
      aria-labelledby="community-write-gate-title"
      className="rounded-lg border border-line bg-white p-4"
      id="community-write-gate"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          <MessageCircleWarning aria-hidden="true" size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <StatusPill tone="caution">쓰기 기능 준비 중</StatusPill>
          <h3 className="mt-2 font-bold" id="community-write-gate-title">
            {getGateHeading(option.label)}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {selected.cardTitle}에서 선택한 {option.label} 기능은 실제 저장 없이
            오픈 상태만 확인합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-surface-soft p-3">
        <div className="flex items-start gap-2">
          <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={16} />
          <div>
            <p className="text-sm font-bold">{option.description}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{option.nextStep}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {option.blockedBy.map((item) => (
            <span
              className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
        <Button
          className="mt-3 w-full sm:w-auto"
          disabled={probe.status === "pending"}
          onClick={() => {
            void submitWriteProbe(selected);
          }}
          variant="secondary"
        >
          {probe.status === "pending" ? "확인 중" : "오픈 상태 확인"}
        </Button>
      </div>

      <WriteProbeStatus probe={probe} />
    </section>
  );

  async function submitWriteProbe(nextSelected: CommunityWriteGateSelection) {
    setProbe({ status: "pending" });

    try {
      const response = await fetch("/api/community-feed", {
        body: JSON.stringify(createWriteProbePayload(nextSelected)),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | ApiClosedPayload
        | null;

      if (body?.error === "feature_closed") {
        setProbe({
          blockedBy: body.display.blockedBy,
          message: body.display.message,
          nextStep: body.display.nextStep,
          status: "closed",
        });
        return;
      }

      if (!response.ok) {
        setProbe({
          message: "오픈 상태를 확인하지 못했어요. 잠시 뒤 다시 시도해주세요.",
          status: "error",
        });
        return;
      }

      setProbe({
        blockedBy: ["게시 전 안전 확인"],
        message: "피드 쓰기 기능은 아직 순차 오픈 준비 중이에요.",
        nextStep: "운영 검증이 끝나면 글쓰기와 댓글을 차례로 열겠습니다.",
        status: "closed",
      });
    } catch {
      setProbe({
        message: "네트워크 연결 때문에 오픈 상태를 확인하지 못했어요.",
        status: "error",
      });
    }
  }
}

function getGateHeading(label: string) {
  if (label === "글쓰기") return "글쓰기는 아직 열기 전이에요";

  return `${label}은 아직 열기 전이에요`;
}

function createWriteProbePayload(selected: CommunityWriteGateSelection) {
  if (selected.kind === "reaction") {
    return {
      action: "react",
      reaction: "like",
      target: selected.target ?? {
        id: "community_read_feed_card",
        type: "community_preview_card",
      },
    };
  }

  if (selected.kind === "comment") {
    return {
      action: "create_comment",
      body: "댓글 오픈 상태 확인",
      target: selected.target ?? {
        id: "community_read_feed_card",
        type: "community_preview_card",
      },
    };
  }

  return {
    action: "create_post",
    body: "글쓰기 오픈 상태 확인",
    visibility: "public",
  };
}

function WriteProbeStatus({ probe }: { probe: WriteProbeState }) {
  if (probe.status === "idle") return null;

  if (probe.status === "pending") {
    return (
      <p
        aria-live="polite"
        className="mt-3 rounded-lg bg-surface-soft px-3 py-2 text-sm font-semibold text-muted"
        role="status"
      >
        피드 오픈 상태 확인 중
      </p>
    );
  }

  if (probe.status === "error") {
    return (
      <p className="mt-3 rounded-lg bg-[#fff4dc] px-3 py-2 text-sm font-semibold text-[#9a6400]" role="alert">
        {probe.message}
      </p>
    );
  }

  return (
    <div
      aria-live="polite"
      className="mt-3 rounded-lg border border-line bg-surface-soft p-3"
      role="status"
    >
      <p className="text-sm font-black">현재 오픈 상태</p>
      <p className="mt-1 text-sm leading-6 text-muted">{probe.message}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{probe.nextStep}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {probe.blockedBy.map((item) => (
          <span
            className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
