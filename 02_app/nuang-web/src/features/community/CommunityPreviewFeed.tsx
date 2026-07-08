import { ArrowRight, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { CommunitySafetyActionPanel } from "@/features/community/CommunitySafetyActionPanel";
import { LocalPublicProfileCardPreview } from "@/features/community/LocalPublicProfileCardPreview";
import {
  communityPreviewSafetyLines,
  listCommunityPreviewCards,
  type CommunityPreviewCard,
} from "@/features/community/community-preview-seed";

export function CommunityPreviewFeed() {
  const cards = listCommunityPreviewCards();

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <StatusPill tone="primary">커뮤니티 미리보기</StatusPill>
          <h2 className="mt-3 text-lg font-bold">가볍게 나누는 성향 피드</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            글쓰기보다 먼저 안전한 카드와 질문부터 열어, 공개 범위를 넘지 않게
            준비합니다.
          </p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          <MessageCircle aria-hidden="true" size={22} />
        </div>
      </div>

      <div className="mt-5">
        <LocalPublicProfileCardPreview />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {["읽기 피드", "가벼운 반응", "글쓰기"].map((item, index) => (
          <div
            className="rounded-lg border border-line bg-surface-soft px-2 py-3 text-center"
            key={item}
          >
            <p className="text-[11px] font-black text-primary">0{index + 1}</p>
            <p className="mt-1 truncate text-xs font-bold">{item}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        {cards.map((card) => (
          <CommunityPreviewCardView card={card} key={card.kind} />
        ))}
      </div>

      <CommunitySafetyActionPanel />

      <div className="mt-5 grid gap-2">
        {communityPreviewSafetyLines.map((line) => (
          <div
            className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm font-semibold text-muted"
            key={line}
          >
            <ShieldCheck aria-hidden="true" className="shrink-0 text-success" size={16} />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommunityPreviewCardView({ card }: { card: CommunityPreviewCard }) {
  return (
    <article className="overflow-hidden rounded-lg border border-line">
      <div className="flex items-center gap-3 bg-surface-soft p-3">
        <NuangCharacter motif={card.motif} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{card.title}</h3>
            <StatusPill tone="neutral">준비 중</StatusPill>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">{card.body}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <p className="text-xs font-semibold text-muted">
          공개 범위와 신고 체계 확인 후 열림
        </p>
        <Button
          aria-label={`${card.title} ${card.actionLabel}`}
          className="min-h-10 shrink-0 px-3"
          disabled
          icon={
            card.kind === "daily_question" ? (
              <ArrowRight aria-hidden="true" size={15} />
            ) : (
              <Sparkles aria-hidden="true" size={15} />
            )
          }
          variant="secondary"
        >
          {card.actionLabel}
        </Button>
      </div>
    </article>
  );
}
