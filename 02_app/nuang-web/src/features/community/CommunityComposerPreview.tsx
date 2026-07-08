"use client";

import { LockKeyhole, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { hasSensitiveCommunityTopic } from "@/features/community/community-topic-safety";
import type { ApiClosedPayload } from "@/lib/api/closed-state-data";

type ComposerStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "blocked" }
  | {
      blockedBy: string[];
      message: string;
      nextStep: string;
      status: "closed";
    }
  | { message: string; status: "error" };

const visibilityOptions = [
  {
    description: "피드에서 함께 볼 수 있어요.",
    label: "전체 공개",
    value: "public",
  },
  {
    description: "공개 프로필 맥락에만 붙여요.",
    label: "프로필 공개",
    value: "profile_public",
  },
  {
    description: "작성 흐름만 확인해요.",
    label: "나만 보기",
    value: "private_draft",
  },
] as const;

export function CommunityComposerPreview() {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] =
    useState<(typeof visibilityOptions)[number]["value"]>("public");
  const [status, setStatus] = useState<ComposerStatus>({ status: "idle" });
  const trimmedBody = body.trim();
  const canSubmit = trimmedBody.length >= 2 && status.status !== "pending";
  const submitLabel =
    status.status === "pending"
      ? "확인 중"
      : canSubmit
        ? "게시 준비 확인"
        : "글 입력 후 확인";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasSensitiveCommunityTopic(trimmedBody)) {
      setStatus({
        message:
          "이 주제는 피드보다 도움 허브나 전문가 연결 흐름에서 더 안전하게 다룰게요.",
        status: "blocked",
      });
      return;
    }

    if (!canSubmit) {
      setStatus({
        message: "짧은 문장으로 오늘의 생각을 먼저 적어주세요.",
        status: "error",
      });
      return;
    }

    setStatus({ status: "pending" });

    try {
      const response = await fetch("/api/community-feed", {
        body: JSON.stringify({
          action: "create_post",
          body: trimmedBody,
          visibility,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | ApiClosedPayload
        | null;

      if (payload?.error === "feature_closed") {
        setStatus({
          blockedBy: payload.display.blockedBy,
          message: payload.display.message,
          nextStep: payload.display.nextStep,
          status: "closed",
        });
        return;
      }

      if (!response.ok) {
        setStatus({
          message: "게시 준비 상태를 확인하지 못했어요.",
          status: "error",
        });
        return;
      }

      setStatus({
        blockedBy: ["게시 전 안전 확인"],
        message: "피드 글쓰기는 아직 순차 오픈 준비 중이에요.",
        nextStep: "운영 검증이 끝나면 글쓰기 흐름을 차례로 열겠습니다.",
        status: "closed",
      });
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 게시 준비 상태를 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_14px_30px_rgb(63_56_118_/_8%)]">
      <div className="h-1.5 bg-primary" />
      <form className="grid gap-4 p-4" onSubmit={handleSubmit}>
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <Send aria-hidden="true" size={19} />
          </div>
          <div className="min-w-0">
            <StatusPill tone="primary">커뮤니티 글쓰기</StatusPill>
            <h2 className="mt-3 text-lg font-black">
              오늘은 어떤 차이를 발견했나요?
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              가벼운 생각과 공개 가능한 성향 맥락만 피드에 남겨요.
            </p>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold">글 내용</span>
          <textarea
            className="min-h-28 resize-none rounded-lg border border-line bg-surface-soft px-3 py-3 text-sm font-semibold leading-6 outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-white"
            maxLength={800}
            onChange={(event) => setBody(event.target.value)}
            placeholder="예: 나는 대화 전에 생각을 정리할 시간이 있으면 더 편해요."
            value={body}
          />
        </label>

        <div>
          <p className="text-sm font-bold">공개 범위</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {visibilityOptions.map((option) => {
              const isSelected = option.value === visibility;

              return (
                <button
                  aria-label={option.label}
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "rounded-lg border border-primary bg-surface-soft p-3 text-left"
                      : "rounded-lg border border-line bg-white p-3 text-left transition-colors hover:border-primary/40"
                  }
                  key={option.value}
                  onClick={() => setVisibility(option.value)}
                  type="button"
                >
                  <span className="text-sm font-black">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 rounded-lg bg-surface-soft p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={17} />
            <p className="text-sm font-semibold leading-6 text-muted">
              직접 응답, 원점수, 민감 항목은 피드에 담지 않아요.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={17} />
            <p className="text-sm font-semibold leading-6 text-muted">
              치료나 위기 주제는 도움 허브에서 더 안전하게 안내해요.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-muted">
            {trimmedBody.length} / 800
          </p>
          <Button
            className="w-full sm:w-auto"
            disabled={!canSubmit}
            icon={<Send aria-hidden="true" size={17} />}
            type="submit"
          >
            {submitLabel}
          </Button>
        </div>

        <ComposerStatusMessage status={status} />
      </form>
    </section>
  );
}

function ComposerStatusMessage({ status }: { status: ComposerStatus }) {
  if (status.status === "idle") return null;

  if (status.status === "pending") {
    return (
      <p
        aria-live="polite"
        className="rounded-lg bg-surface-soft px-3 py-2 text-sm font-semibold text-muted"
        role="status"
      >
        게시 준비 상태 확인 중
      </p>
    );
  }

  if (status.status === "blocked") {
    return (
      <div className="rounded-lg bg-[#fff4dc] p-3" role="alert">
        <p className="text-sm font-bold text-[#9a6400]">{status.message}</p>
        <Link className="mt-2 inline-flex text-sm font-bold text-primary" href="/help">
          도움 허브 보기
        </Link>
      </div>
    );
  }

  if (status.status === "error") {
    return (
      <p className="rounded-lg bg-[#fff4dc] px-3 py-2 text-sm font-semibold text-[#9a6400]" role="alert">
        {status.message}
      </p>
    );
  }

  return (
    <div
      aria-live="polite"
      className="rounded-lg border border-line bg-surface-soft p-3"
      role="status"
    >
      <p className="text-sm font-black">게시 준비 상태</p>
      <p className="mt-1 text-sm leading-6 text-muted">{status.message}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{status.nextStep}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {status.blockedBy.map((item) => (
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
