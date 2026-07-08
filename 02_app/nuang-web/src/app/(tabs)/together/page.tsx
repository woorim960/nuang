import {
  MessageCircle,
  PenLine,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { CommunityComposerPreview } from "@/features/community/CommunityComposerPreview";
import { CommunityPreviewFeed } from "@/features/community/CommunityPreviewFeed";
import { CommunityReadFeed } from "@/features/community/CommunityReadFeed";
import { TogetherReadiness } from "@/features/together/TogetherReadiness";
import { togetherSafetyLines } from "@/features/together/profile-visibility-policy";

const togetherRouteCards = [
  {
    caption: "공개 범위 안에서 바로 비교 준비",
    href: "#public-comparison",
    icon: UsersRound,
    label: "공개 비교",
    status: "먼저",
  },
  {
    caption: "공식 주제 카드부터 읽기",
    href: "#feed",
    icon: MessageCircle,
    label: "읽기 피드",
    status: "열림",
  },
  {
    caption: "게시 전 안전 조건만 확인",
    href: "#write-preview",
    icon: PenLine,
    label: "글쓰기 준비",
    status: "닫힘",
  },
] as const;

export default function TogetherPage() {
  return (
    <div className="grid gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black text-primary">NUANG SOCIAL</p>
          <h1 className="mt-2 text-2xl font-black">함께</h1>
          <p className="mt-1 text-sm text-muted">
            피드, 공개 프로필, 1:1 비교가 만나는 공간이에요.
          </p>
        </div>
        <StatusPill tone="caution">커뮤니티 준비</StatusPill>
      </header>

      <section aria-labelledby="together-route-title" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold" id="together-route-title">
              먼저 볼 순서
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              비교와 읽기 경험을 먼저 보고, 글쓰기는 준비 상태만 확인해요.
            </p>
          </div>
          <StatusPill tone="success">Read-only</StatusPill>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {togetherRouteCards.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                aria-label={`${item.status} ${item.label}: ${item.caption}`}
                className="grid min-h-32 content-between rounded-lg border border-line bg-white p-3 shadow-[0_10px_24px_rgb(63_56_118_/_6%)]"
                href={item.href}
                key={item.href}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <StatusPill tone="neutral">{item.status}</StatusPill>
                </span>
                <span className="mt-3">
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="mt-1 block text-[11px] font-semibold leading-4 text-muted">
                    {item.caption}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div id="public-comparison">
        <TogetherReadiness />
      </div>

      <div id="feed">
        <CommunityReadFeed />
      </div>

      <div id="community-preview">
        <CommunityPreviewFeed />
      </div>

      <div id="write-preview">
        <CommunityComposerPreview />
      </div>

      <section className="grid gap-3" id="comparison-safety">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <ShieldCheck aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">비교 안전선</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              공개 비교와 커뮤니티 미리보기 모두 이 기준을 넘지 않아요.
            </p>
          </div>
        </div>
        {togetherSafetyLines.map((item) => (
          <div
            className="flex min-h-14 items-center justify-between rounded-lg border border-line bg-white px-4"
            key={item}
          >
            <span className="font-semibold">{item}</span>
            <StatusPill tone="success">적용</StatusPill>
          </div>
        ))}
      </section>
    </div>
  );
}
