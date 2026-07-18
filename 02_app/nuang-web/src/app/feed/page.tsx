import {
  ArrowLeft,
  BadgeCheck,
  Search,
  Send,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { FeedActionButtons } from "@/features/feed/FeedActionButtons";
import { FeedComposer } from "@/features/feed/FeedComposer";
import { FeedMoreMenu } from "@/features/feed/FeedMoreMenu";
import { FeedPollCard } from "@/features/feed/FeedPollCard";
import {
  listFeedStories,
  type FeedItem,
  type FeedStory,
} from "@/features/feed/feed-seed";
import {
  PublicProfileButton,
} from "@/features/public-profile/PublicProfileModal";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import { createServerFeedReadPayload } from "@/features/feed/server-read";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "피드 | NUANG",
};

const storyToneClass = {
  flame: "from-[#f97316] to-[#ef4444]",
  forest: "from-[#16a34a] to-[#84cc16]",
  purple: "from-[#111111] to-[#7c3aed]",
  sun: "from-[#f59e0b] to-[#facc15]",
  water: "from-[#0ea5e9] to-[#22c55e]",
} as const satisfies Record<FeedStory["tone"], string>;

export default async function FeedPage() {
  const stories = listFeedStories();
  const feedPayload = await createServerFeedReadPayload();
  const posts = feedPayload.items;

  return (
    <div className="min-h-dvh bg-white text-[#111111]">
      <main className="mx-auto min-h-dvh w-full max-w-[470px] border-x border-[#ececec] bg-white pb-[calc(86px+env(safe-area-inset-bottom))]">
        <h1 className="sr-only">피드</h1>
        <header className="sticky top-0 z-20 flex h-[58px] items-center justify-between border-b border-[#ececec] bg-white/90 px-4 backdrop-blur-xl">
          <Link
            aria-label="홈으로 돌아가기"
            className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-[#111111] hover:bg-[#f5f5f5]"
            href="/home"
          >
            <ArrowLeft aria-hidden="true" size={22} strokeWidth={1.9} />
          </Link>
          <Link className="text-[21px] font-black tracking-normal" href="/home">
            NUANG
          </Link>
          <div className="flex items-center gap-1">
            <button
              aria-label="피드 검색"
              className="grid h-10 w-10 place-items-center rounded-full text-[#111111] hover:bg-[#f5f5f5]"
              type="button"
            >
              <Search aria-hidden="true" size={22} strokeWidth={1.9} />
            </button>
            <button
              aria-label="메시지"
              className="grid h-10 w-10 place-items-center rounded-full text-[#111111] hover:bg-[#f5f5f5]"
              type="button"
            >
              <Send aria-hidden="true" size={21} strokeWidth={1.9} />
            </button>
          </div>
        </header>

        <div className="sticky top-[58px] z-10 grid h-[52px] grid-cols-2 border-b border-[#ececec] bg-white/90 backdrop-blur-xl">
          <button
            className="relative text-[15px] font-bold text-[#111111] after:absolute after:inset-x-[24%] after:bottom-0 after:h-[2px] after:rounded-t-full after:bg-[#111111]"
            type="button"
          >
            추천
          </button>
          <button className="text-[15px] font-bold text-[#737373]" type="button">
            팔로잉
          </button>
        </div>

        <section
          aria-label="스토리"
          className="flex gap-3 overflow-x-auto border-b border-[#ececec] px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {stories.map((story) => (
            <StoryBubble story={story} key={story.id} />
          ))}
        </section>

        <FeedComposer />

        <section aria-label="추천 피드">
          {posts.map((post) =>
            post.layout === "media" ? (
              <MediaPost post={post} key={post.id} />
            ) : (
              <ThreadPost post={post} key={post.id} />
            ),
          )}
        </section>
      </main>
      <BottomNavigation />
    </div>
  );
}

function StoryBubble({ story }: { story: FeedStory }) {
  return (
    <button className="w-[70px] shrink-0 text-center" type="button">
      <span
        className={cn(
          "mx-auto block h-16 w-16 rounded-full p-[2px]",
          story.seen
            ? "bg-[#dddddd]"
            : `bg-gradient-to-tr ${storyToneClass[story.tone]}`,
        )}
      >
        <span className="grid h-full w-full place-items-center rounded-full border-[3px] border-white bg-[#111111] text-[15px] font-black text-white">
          {story.avatarLabel}
        </span>
      </span>
      <span className="mt-1.5 block truncate text-xs font-medium text-[#333333]">
        {story.label}
      </span>
    </button>
  );
}

function ThreadPost({ post }: { post: FeedItem }) {
  return (
    <article className="grid grid-cols-[48px_minmax(0,1fr)] gap-1 border-b border-[#ececec] px-3 py-4">
      <div>
        <Avatar
          label={post.avatarLabel}
          profile={post.authorProfile}
          profileLabel={post.authorName}
        />
        <div className="mx-auto mt-2 h-[calc(100%-44px)] min-h-10 w-px bg-[#eeeeee]" />
      </div>
      <div className="min-w-0 pb-1">
        <PostHeader post={post} />
        <p className="mt-1 text-[15px] font-bold leading-5 text-[#111111]">
          {post.title}
        </p>
        <p className="mt-2 text-[15px] leading-[1.48] text-[#171717]">
          {post.body}
        </p>
        {post.poll ? <FeedPollCard poll={post.poll} /> : null}
        {post.reportShare ? <ReportSharePreview post={post} /> : null}
        <FeedActionButtons
          className="mt-3"
          includeBookmark
          initialBookmarked={post.viewerHasBookmarked}
          initialLiked={post.viewerHasLiked}
          postId={post.id}
          replyPreview={post.replyPreview}
          targetType={post.targetType}
        />
        <ReplyLine post={post} />
      </div>
    </article>
  );
}

function ReportSharePreview({ post }: { post: FeedItem }) {
  if (!post.reportShare) return null;

  return (
    <Link
      className="mt-4 block border-y border-[#ececec] py-4 hover:opacity-80"
      href={post.reportShare.href}
    >
      <p className="text-xs font-bold text-[#737373]">공유 리포트</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[28px] font-black leading-none tracking-normal text-[#111111]">
            {post.reportShare.profileCode}
          </p>
          <p className="mt-2 truncate text-sm font-extrabold text-[#111111]">
            {post.reportShare.profileName}
          </p>
        </div>
        <span className="shrink-0 text-sm font-black text-[#111111]">리포트 보기</span>
      </div>
      {post.reportShare.domains.length > 0 ? (
        <div className="mt-4 space-y-2">
          {post.reportShare.domains.slice(0, 3).map((domain) => (
            <div className="flex items-center gap-3" key={domain.domainId}>
              <span className="w-16 shrink-0 truncate text-xs font-bold text-[#737373]">
                {domain.label}
              </span>
              <span className="h-[3px] min-w-0 flex-1 bg-[#eeeeee]">
                <span
                  className="block h-full bg-[#111111]"
                  style={{ width: `${domain.score ?? 0}%` }}
                />
              </span>
              <span className="w-7 text-right text-xs font-black tabular-nums text-[#111111]">
                {domain.score === null ? "-" : Math.round(domain.score)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

function MediaPost({ post }: { post: FeedItem }) {
  return (
    <article className="border-b border-[#ececec] bg-white">
      <div className="flex items-center gap-2 px-3 py-3">
        <Avatar
          label={post.avatarLabel}
          profile={post.authorProfile}
          profileLabel={post.authorName}
          size="sm"
        />
        <PostHeader post={post} compact />
      </div>
      <div
        className={cn(
          "relative min-h-[300px] overflow-hidden bg-[#f1f1f1]",
          post.visualTone === "dark"
            ? "bg-[radial-gradient(circle_at_70%_24%,rgba(255,255,255,.16)_0_10%,transparent_11%),linear-gradient(135deg,#171717_0%,#262032_44%,#6d5dfc_100%)]"
            : "bg-[radial-gradient(circle_at_72%_24%,rgba(255,255,255,.75)_0_10%,transparent_11%),linear-gradient(135deg,#fafafa_0%,#ede9fe_52%,#b8d7ff_100%)]",
        )}
      >
        <div
          className={cn(
            "absolute bottom-5 left-5 text-[28px] font-black tracking-normal",
            post.visualTone === "dark" ? "text-white" : "text-[#111111]",
          )}
        >
          {post.mediaLabel}
        </div>
      </div>
      <div className="px-3 pb-4 pt-3">
        <FeedActionButtons
          className="w-full"
          includeBookmark
          initialBookmarked={post.viewerHasBookmarked}
          initialLiked={post.viewerHasLiked}
          postId={post.id}
          replyPreview={post.replyPreview}
          targetType={post.targetType}
        />
        <div className="mt-1 text-sm font-bold">{post.likeLabel}</div>
        <p className="mt-1 text-sm leading-[1.45]">
          <span className="font-bold">{post.authorHandle}</span>{" "}
          <span className="font-semibold">{post.title}</span> {post.body}
        </p>
        <div className="mt-1 text-sm text-[#737373]">{post.replyLabel} 모두 보기</div>
        <div className="mt-2 text-xs text-[#8a8a8a]">{post.timeLabel} 전</div>
      </div>
    </article>
  );
}

function PostHeader({
  compact = false,
  post,
}: {
  compact?: boolean;
  post: FeedItem;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <AuthorName post={post} text={compact ? post.authorHandle : post.authorName} />
          {post.verified && (
            <BadgeCheck
              aria-label="인증됨"
              className="h-[15px] w-[15px] shrink-0 fill-[#1d9bf0] text-white"
              strokeWidth={2.2}
            />
          )}
          <span className="shrink-0 text-sm text-[#737373]">· {post.timeLabel}</span>
          {post.statusLabel ? (
            <span className="shrink-0 text-sm text-[#737373]">
              · {post.statusLabel}
            </span>
          ) : null}
        </div>
        {!compact && (
          <div className="truncate text-xs font-medium text-[#737373]">
            {post.authorHandle}
          </div>
        )}
      </div>
      <FeedMoreMenu postId={post.id} targetType={post.targetType} />
    </div>
  );
}

function ReplyLine({ post }: { post: FeedItem }) {
  const knownLikeCount = post.likeCount ?? null;
  const knownReplyCount = post.replyCount ?? null;
  const hasKnownEngagement = knownLikeCount !== null || knownReplyCount !== null;
  const hasVisibleEngagement =
    !hasKnownEngagement || Boolean((knownLikeCount ?? 0) + (knownReplyCount ?? 0));

  return (
    <div className="mt-2 flex items-center gap-2 text-[13px] text-[#737373]">
      {hasVisibleEngagement ? (
        <span className="relative block h-6 w-12">
          <span className="absolute left-0 h-[22px] w-[22px] rounded-full border-2 border-white bg-[#d8d8d8]" />
          <span className="absolute left-3.5 h-[22px] w-[22px] rounded-full border-2 border-white bg-[#b9c7ff]" />
          <span className="absolute left-7 h-[22px] w-[22px] rounded-full border-2 border-white bg-[#d9f99d]" />
        </span>
      ) : null}
      <span>
        {post.replyLabel} · {post.likeLabel}
      </span>
    </div>
  );
}

function Avatar({
  label,
  profile,
  profileLabel,
  size = "md",
}: {
  label: string;
  profile?: FeedItem["authorProfile"];
  profileLabel?: string;
  size?: "md" | "sm";
}) {
  if (profile) {
    return (
      <PublicProfileButton
        ariaLabel={`${profileLabel ?? profile.display.displayName} 프로필 보기`}
        className="rounded-full"
        profile={profile}
      >
        <PublicProfileImageView
          className={size === "sm" ? undefined : "h-[38px] w-[38px]"}
          image={profile.display.profileImage}
          size="sm"
        />
      </PublicProfileButton>
    );
  }

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-[#111111] font-black text-white",
        size === "sm" ? "h-9 w-9 text-sm" : "h-[38px] w-[38px] text-[15px]",
      )}
    >
      {label}
    </div>
  );
}

function AuthorName({ post, text }: { post: FeedItem; text: string }) {
  const label = (
    <span className="block truncate text-sm font-extrabold text-[#111111]">
      {text}
    </span>
  );

  if (!post.authorProfile) {
    return label;
  }

  return (
    <PublicProfileButton
      ariaLabel={`${post.authorName} 프로필 보기`}
      className="block max-w-full truncate"
      profile={post.authorProfile}
    >
      {label}
    </PublicProfileButton>
  );
}
