"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readJsonResponse } from "@/features/account/response-json";
import type { FeedItem } from "@/features/feed/feed-seed";
import { normalizeFeedTag } from "@/features/feed/feed-topic";
import {
  normalizePublicProfileSearchQuery,
  publicProfileSearchDebounceMs,
  type PublicProfileSearchIntent,
  type PublicProfileSearchItem,
  type PublicProfileSearchResponse,
} from "@/features/public-profile/public-profile-search-contract";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import { CommunityScreenShell } from "./CommunityScreenShell";
import styles from "./CommunitySecondaryScreen.module.css";

type ProfileSearchState = {
  profiles: PublicProfileSearchItem[];
  query: string | null;
  status: "error" | "idle" | "loading" | "success";
};

export function CommunitySearchScreen({
  intent = "browse",
  posts,
}: {
  intent?: PublicProfileSearchIntent;
  posts: FeedItem[];
}) {
  const [query, setQuery] = useState("");
  const [profileSearch, setProfileSearch] = useState<ProfileSearchState>({
    profiles: [],
    query: null,
    status: "idle",
  });
  const [retryKey, setRetryKey] = useState(0);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const isTagQuery = normalizedQuery.startsWith("#");
  const normalizedTagQuery = normalizeFeedTag(
    normalizedQuery.replace(/^#+/, ""),
  ).toLocaleLowerCase("ko-KR");
  const normalizedProfileQuery = useMemo(
    () => normalizePublicProfileSearchQuery(query),
    [query],
  );
  const isCompareIntent = intent === "compare";

  useEffect(() => {
    if (isTagQuery || !normalizedProfileQuery.ok) return;

    const controller = new AbortController();
    const requestQuery = normalizedProfileQuery.value;
    const timeout = window.setTimeout(async () => {
      setProfileSearch({
        profiles: [],
        query: requestQuery,
        status: "loading",
      });

      try {
        const response = await fetch(
          `/api/community/profiles/search?q=${encodeURIComponent(normalizedProfileQuery.value)}`,
          {
            cache: "no-store",
            method: "GET",
            signal: controller.signal,
          },
        );
        const body =
          await readJsonResponse<PublicProfileSearchResponse>(response);

        if (!response.ok || !body?.ok || !Array.isArray(body.profiles)) {
          throw new Error("profile_search_failed");
        }

        setProfileSearch({
          profiles: body.profiles,
          query: requestQuery,
          status: "success",
        });
      } catch {
        if (controller.signal.aborted) return;
        setProfileSearch({
          profiles: [],
          query: requestQuery,
          status: "error",
        });
      }
    }, publicProfileSearchDebounceMs);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isTagQuery, normalizedProfileQuery, retryKey]);

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    if (isTagQuery) {
      if (!normalizedTagQuery) return [];
      return posts.filter((post) =>
        post.topic?.tags.some((tag) =>
          normalizeFeedTag(tag)
            .toLocaleLowerCase("ko-KR")
            .includes(normalizedTagQuery),
        ),
      );
    }

    return posts.filter((post) =>
      createPostSearchText(post).includes(normalizedQuery),
    );
  }, [isTagQuery, normalizedQuery, normalizedTagQuery, posts]);
  const tagResults = useMemo(() => {
    if (!normalizedQuery || !normalizedTagQuery) return [];

    const tags = new Map<string, { count: number; label: string }>();
    for (const post of posts) {
      for (const tag of post.topic?.tags ?? []) {
        const normalizedTag = normalizeFeedTag(tag).toLocaleLowerCase("ko-KR");
        if (!normalizedTag.includes(normalizedTagQuery)) continue;
        const current = tags.get(normalizedTag);
        tags.set(normalizedTag, {
          count: (current?.count ?? 0) + 1,
          label: current?.label ?? tag,
        });
      }
    }

    return [...tags.values()].sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label, "ko"),
    );
  }, [normalizedQuery, normalizedTagQuery, posts]);
  const suggestedTags = useMemo(() => {
    const tags = new Map<string, { count: number; label: string }>();
    for (const post of posts) {
      for (const tag of post.topic?.tags ?? []) {
        const normalizedTag = normalizeFeedTag(tag).toLocaleLowerCase("ko-KR");
        const current = tags.get(normalizedTag);
        tags.set(normalizedTag, {
          count: (current?.count ?? 0) + 1,
          label: current?.label ?? tag,
        });
      }
    }

    return [...tags.values()]
      .sort(
        (left, right) =>
          right.count - left.count ||
          left.label.localeCompare(right.label, "ko"),
      )
      .slice(0, 6);
  }, [posts]);
  const activeProfileSearch =
    normalizedProfileQuery.ok &&
    profileSearch.query === normalizedProfileQuery.value
      ? profileSearch
      : ({
          profiles: [],
          query: null,
          status: "idle",
        } satisfies ProfileSearchState);
  const profileResults = isCompareIntent
    ? activeProfileSearch.profiles.filter(
        (profile) => profile.comparisonAvailable,
      )
    : activeProfileSearch.profiles;
  const totalResultCount =
    tagResults.length + results.length + profileResults.length;
  const profileSearchPending =
    !isTagQuery &&
    normalizedProfileQuery.ok &&
    (activeProfileSearch.status === "idle" ||
      activeProfileSearch.status === "loading");
  const profileSearchFailed = activeProfileSearch.status === "error";
  const showNoResults =
    normalizedQuery.length > 0 &&
    totalResultCount === 0 &&
    !profileSearchPending &&
    !profileSearchFailed &&
    (isTagQuery || activeProfileSearch.status === "success");

  return (
    <CommunityScreenShell
      title={isCompareIntent ? "비교할 사람 찾기" : "커뮤니티 검색"}
    >
      <section className={styles.searchSection}>
        <div className={styles.searchField}>
          <Search aria-hidden="true" size={19} />
          <input
            aria-label="커뮤니티 검색어"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              isCompareIntent
                ? "닉네임, 사용자 ID, 뉴앙 코드 검색"
                : "게시물, #태그, 닉네임, 뉴앙 코드 검색"
            }
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="검색어 지우기"
              onClick={() => setQuery("")}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          ) : null}
        </div>
      </section>

      {isCompareIntent ? (
        <p className={styles.searchGuide}>
          프로필을 확인한 뒤 공개된 성향으로 비교할 수 있어요.
        </p>
      ) : null}

      {normalizedQuery ? (
        <>
          <div className={styles.resultHeader}>
            <strong>{isCompareIntent ? "사람" : "검색 결과"}</strong>
            <span>
              {profileSearchPending
                ? "찾는 중"
                : `${totalResultCount.toLocaleString("ko-KR")}개`}
            </span>
          </div>

          {tagResults.length > 0 ? (
            <section className={styles.resultGroup}>
              <strong className={styles.resultGroupTitle}>태그</strong>
              <div className={styles.tagResultList}>
                {tagResults.map((tag) => (
                  <Link
                    className={styles.tagResultItem}
                    href={`/feed/tags/${encodeURIComponent(tag.label)}`}
                    key={tag.label}
                  >
                    <span>#{tag.label}</span>
                    <small>게시물 {tag.count.toLocaleString("ko-KR")}개</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {!isTagQuery && normalizedProfileQuery.ok ? (
            <section className={styles.resultGroup}>
              <strong className={styles.resultGroupTitle}>
                {isCompareIntent ? "비교할 수 있는 프로필" : "프로필"}
              </strong>
              {profileSearchPending ? (
                <SearchStatus text="공개 프로필을 찾고 있어요" />
              ) : profileSearchFailed ? (
                <SearchStatus
                  action={() => setRetryKey((current) => current + 1)}
                  text="사람 검색을 완료하지 못했어요"
                />
              ) : profileResults.length > 0 ? (
                <div className={styles.resultList}>
                  {profileResults.map((profile) => (
                    <ProfileSearchResult
                      intent={intent}
                      key={profile.publicProfileId}
                      profile={profile}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {results.length > 0 ? (
            <section className={styles.resultGroup}>
              <strong className={styles.resultGroupTitle}>게시물</strong>
              <div className={styles.resultList}>
                {results.map((post) => (
                  <Link
                    className={styles.resultItem}
                    href={`/feed/posts/${post.id}`}
                    key={post.id}
                  >
                    <span className={styles.resultAvatar}>
                      {post.avatarLabel.slice(0, 1)}
                    </span>
                    <span className={styles.resultCopy}>
                      <strong>{post.authorName}</strong>
                      <small>{post.body || post.title}</small>
                    </span>
                    {post.authorProfile?.display.code ? (
                      <span className={styles.resultCode}>
                        {post.authorProfile.display.code}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {!isTagQuery && !normalizedProfileQuery.ok ? (
            <SearchInputGuide code={normalizedProfileQuery.code} />
          ) : null}

          {showNoResults ? (
            <div className={styles.emptyState}>
              <div>
                <span aria-hidden="true" className={styles.emptyMark}>
                  <Search size={22} />
                </span>
                <strong>
                  {isTagQuery
                    ? "일치하는 태그가 아직 없어요"
                    : isCompareIntent
                      ? "비교할 수 있는 프로필이 없어요"
                      : "일치하는 공개 프로필이나 게시물이 없어요"}
                </strong>
                <p>
                  {isTagQuery
                    ? "# 뒤의 단어를 줄이거나 다른 태그를 입력해 보세요."
                    : "닉네임, 사용자 ID 또는 뉴앙 코드를 확인해 보세요."}
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : suggestedTags.length > 0 && !isCompareIntent ? (
        <section className={styles.resultGroup}>
          <strong className={styles.resultGroupTitle}>추천 태그</strong>
          <div className={styles.tagResultList}>
            {suggestedTags.map((tag) => (
              <Link
                className={styles.tagResultItem}
                href={`/feed/tags/${encodeURIComponent(tag.label)}`}
                key={tag.label}
              >
                <span>#{tag.label}</span>
                <small>{tag.count.toLocaleString("ko-KR")}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </CommunityScreenShell>
  );
}

function ProfileSearchResult({
  intent,
  profile,
}: {
  intent: PublicProfileSearchIntent;
  profile: PublicProfileSearchItem;
}) {
  const compareIntent = intent === "compare";
  const href = `/feed/profiles/${profile.publicProfileId}${
    compareIntent ? "?intent=compare" : ""
  }`;

  return (
    <Link className={styles.resultItem} href={href}>
      <PublicProfileImageView image={profile.profileImage} size="sm" />
      <span className={styles.resultCopy}>
        <strong>{profile.displayName}</strong>
        <small>
          @{profile.handle}
          {profile.roleName ? ` · ${profile.roleName}` : ""}
        </small>
      </span>
      <span className={styles.profileResultMeta}>
        <span className={styles.resultCode}>{profile.code ?? "비공개"}</span>
        {compareIntent ? <small>프로필 확인</small> : null}
      </span>
    </Link>
  );
}

function SearchStatus({ action, text }: { action?: () => void; text: string }) {
  return (
    <div aria-live="polite" className={styles.inlineSearchState} role="status">
      <span>{text}</span>
      {action ? (
        <button onClick={action} type="button">
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

function SearchInputGuide({
  code,
}: {
  code: Exclude<
    ReturnType<typeof normalizePublicProfileSearchQuery>,
    { ok: true }
  >["code"];
}) {
  const message =
    code === "too_short"
      ? "사람 검색은 두 글자부터 가능해요."
      : code === "too_long"
        ? "검색어는 32자까지 입력할 수 있어요."
        : "한글, 영문, 숫자로 검색해 주세요.";

  return <p className={styles.searchInputGuide}>{message}</p>;
}

function createPostSearchText(post: FeedItem) {
  return [
    post.authorName,
    post.authorHandle,
    post.authorProfile?.display.code,
    post.authorProfile?.display.profileName,
    post.title,
    post.body,
    post.topic?.label,
    ...(post.topic?.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ko-KR");
}
