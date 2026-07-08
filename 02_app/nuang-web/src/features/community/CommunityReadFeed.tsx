import {
  MapPinned,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { StatusPill } from "@/components/ui/StatusPill";
import { CommunityCommentPreview } from "@/features/community/CommunityCommentPreview";
import { CommunityFeedBridgeRail } from "@/features/community/CommunityFeedBridgeRail";
import { CommunityFeedLocalReadiness } from "@/features/community/CommunityFeedLocalReadiness";
import { CommunityReactionPreview } from "@/features/community/CommunityReactionPreview";
import { CommunitySafetyTargetButton } from "@/features/community/CommunitySafetyTargetButton";
import { CommunityWriteGatePanel } from "@/features/community/CommunityWriteGatePanel";
import {
  listCommunityReadFeedGroups,
  type CommunityReadFeedGroup,
  type CommunityReadFeedItem,
} from "@/features/community/community-read-feed-seed";

const iconByKind = {
  daily_prompt: MessageCircle,
  map_reflection_prompt: MapPinned,
  public_profile_example: ShieldCheck,
  relationship_repair_prompt: UsersRound,
  self_intro_prompt: PenLine,
  trait_card_guide: Sparkles,
} as const;

export function CommunityReadFeed() {
  const groups = listCommunityReadFeedGroups();

  return (
    <section className="grid gap-3" aria-label="커뮤니티 읽기 피드">
      <div className="flex items-center justify-between gap-3">
        <div>
          <StatusPill tone="primary">읽기 피드</StatusPill>
          <h2 className="mt-3 text-lg font-black">지금 볼 수 있는 커뮤니티</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            글쓰기 전, 안전한 공식 카드부터 열어 피드 경험을 먼저 확인해요.
          </p>
        </div>
        <StatusPill tone="caution">쓰기 준비 중</StatusPill>
      </div>

      <CommunityFeedLocalReadiness />

      <CommunityFeedBridgeRail />

      <CommunityReadFeedQuickNav groups={groups} />

      {groups.map((group) => (
        <CommunityReadFeedGroupSection group={group} key={group.id} />
      ))}

      <CommunityWriteGatePanel />
    </section>
  );
}

function CommunityReadFeedQuickNav({
  groups,
}: {
  groups: CommunityReadFeedGroup[];
}) {
  return (
    <nav
      aria-label="커뮤니티 피드 그룹 바로가기"
      className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_10px_24px_rgb(63_56_118_/_6%)]"
    >
      <div className="flex gap-2 overflow-x-auto p-2">
        {groups.map((group) => (
          <a
            aria-label={`${group.label} ${group.items.length}개 보기`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-surface-soft px-3 text-sm font-black text-primary transition-colors hover:bg-[#ebe7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={`#${getCommunityReadFeedGroupDomId(group.id)}`}
            key={group.id}
          >
            <span>{group.label}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-muted">
              {group.items.length}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

function CommunityReadFeedGroupSection({
  group,
}: {
  group: CommunityReadFeedGroup;
}) {
  const headingId = `${getCommunityReadFeedGroupDomId(group.id)}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-3 scroll-mt-24"
      id={getCommunityReadFeedGroupDomId(group.id)}
    >
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-black" id={headingId}>
            {group.label}
          </h3>
          <p className="mt-1 text-xs font-semibold text-muted">
            {group.description}
          </p>
        </div>
        <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-bold text-primary">
          {group.items.length}개
        </span>
      </div>
      {group.items.map((item) => (
        <CommunityReadFeedCard item={item} key={item.id} />
      ))}
    </section>
  );
}

function getCommunityReadFeedGroupDomId(id: CommunityReadFeedGroup["id"]) {
  return `community-feed-group-${id}`;
}

function CommunityReadFeedCard({ item }: { item: CommunityReadFeedItem }) {
  const Icon = iconByKind[item.kind];

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_14px_30px_rgb(63_56_118_/_8%)]">
      <div className="h-1.5 bg-primary" />
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <NuangCharacter motif={item.motif} size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-black">{item.sourceLabel}</p>
              <StatusPill tone="neutral">공식 주제</StatusPill>
              <StatusPill tone="primary">{item.sectionLabel}</StatusPill>
            </div>
            <p className="mt-1 text-xs font-semibold text-muted">
              {item.surfaceLabel} · {item.scopeLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-primary">
            {item.statusLabel}
          </span>
          <MoreHorizontal aria-hidden="true" className="text-muted" size={20} />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <Icon aria-hidden="true" size={19} />
          </div>
          <div className="min-w-0">
            <h3 className="font-black">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-bold text-primary">
            {item.scopeLabel}
          </span>
          {item.chips.map((chip) => (
            <span
              className="rounded-full bg-[#eff0f6] px-3 py-1 text-xs font-bold text-muted"
              key={chip}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <CommunityReactionPreview
        cardTitle={item.title}
        previewCount={item.previewReactionCount}
        target={{
          id: item.safetyTarget.id,
          type: "community_preview_card",
        }}
      />

      <CommunityCommentPreview
        cardTitle={item.title}
        target={{
          id: item.safetyTarget.id,
          type: "community_preview_card",
        }}
      />

      <div className="grid grid-cols-2 gap-2 border-t border-line p-2.5">
        <CommunitySafetyTargetButton target={item.safetyTarget} />
        <Link
          aria-label={`${item.actionLabel} 열기: ${item.title}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg px-2.5 text-center text-sm font-bold leading-5 text-primary transition-colors hover:bg-surface-soft"
          href={item.href}
        >
          {item.actionLabel}
        </Link>
      </div>
    </article>
  );
}
