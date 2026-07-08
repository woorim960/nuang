import {
  ArrowRight,
  ClipboardCheck,
  MapPinned,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  listCommunityFeedBridgeItems,
  type CommunityFeedBridgeItem,
} from "@/features/community/community-feed-bridge";

const bridgeIconById = {
  check_visibility: ShieldCheck,
  compare_preview: UsersRound,
  open_map: MapPinned,
  start_core: ClipboardCheck,
} as const;

export function CommunityFeedBridgeRail() {
  const items = listCommunityFeedBridgeItems();

  return (
    <section
      aria-label="커뮤니티 다음 행동"
      className="rounded-lg border border-line bg-white p-4 shadow-[0_10px_24px_rgb(63_56_118_/_6%)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <StatusPill tone="primary">다음 행동</StatusPill>
          <h3 className="mt-3 text-base font-black">읽은 뒤 바로 이어가기</h3>
        </div>
        <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-bold text-primary">
          {items.length}개
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <CommunityFeedBridgeLink item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function CommunityFeedBridgeLink({ item }: { item: CommunityFeedBridgeItem }) {
  const Icon = bridgeIconById[item.id];

  return (
    <Link
      aria-label={`${item.title} 열기`}
      className="group grid min-h-[136px] content-between rounded-lg border border-line bg-surface-soft p-3 text-left transition-colors hover:border-primary/40 hover:bg-[#f5f2ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      href={item.href}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-[0_8px_18px_rgb(63_56_118_/_8%)]">
          <Icon aria-hidden="true" size={18} />
        </span>
        <span className="min-w-0">
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-primary">
            {item.statusLabel}
          </span>
          <span className="mt-3 block text-sm font-black text-foreground">
            {item.title}
          </span>
          <span className="mt-1 block text-xs font-semibold leading-5 text-muted">
            {item.body}
          </span>
        </span>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-primary">
        {item.actionLabel}
        <ArrowRight
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5"
          size={14}
        />
      </span>
    </Link>
  );
}
