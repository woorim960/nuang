"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FeedItem } from "@/features/feed/feed-seed";
import { normalizeFeedTag } from "@/features/feed/feed-topic";
import { CommunityScreenShell } from "./CommunityScreenShell";
import styles from "./CommunitySecondaryScreen.module.css";

export function CommunitySearchScreen({ posts }: { posts: FeedItem[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const isTagQuery = normalizedQuery.startsWith("#");
  const normalizedTagQuery = normalizeFeedTag(
    normalizedQuery.replace(/^#+/, ""),
  ).toLocaleLowerCase("ko-KR");
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
  const profileResults = useMemo(() => {
    if (!normalizedQuery || isTagQuery) return [];

    const profiles = new Map<string, NonNullable<FeedItem["authorProfile"]>>();
    for (const post of posts) {
      const profile = post.authorProfile;
      if (!profile) continue;
      const profileText = [
        profile.display.displayName,
        profile.display.code,
        profile.display.profileName,
      ]
        .join(" ")
        .toLocaleLowerCase("ko-KR");
      if (profileText.includes(normalizedQuery)) {
        profiles.set(profile.source.publicSnapshotId, profile);
      }
    }

    return [...profiles.values()];
  }, [isTagQuery, normalizedQuery, posts]);
  const totalResultCount =
    tagResults.length + results.length + profileResults.length;

  return (
    <CommunityScreenShell title="커뮤니티 검색">
      <section className={styles.searchSection}>
        <div className={styles.searchField}>
          <Search aria-hidden="true" size={19} />
          <input
            aria-label="커뮤니티 검색어"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="게시물, #태그, 닉네임, 뉴앙 코드 검색"
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

      {!normalizedQuery ? (
        <div className={styles.definitionCard}>
          <strong>검색에서 찾을 수 있는 것</strong>
          <p>
            공개 게시물의 내용과 주제, #태그, 닉네임, 공개된 뉴앙 코드를
            찾아요. 태그를 바로 찾으려면 #을 붙여 입력해 보세요.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.resultHeader}>
            <strong>검색 결과</strong>
            <span>{totalResultCount}개</span>
          </div>
          {totalResultCount > 0 ? (
            <>
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
              {profileResults.length > 0 ? (
                <section className={styles.resultGroup}>
                  <strong className={styles.resultGroupTitle}>프로필</strong>
                  <div className={styles.resultList}>
                    {profileResults.map((profile) => (
                      <Link
                        className={styles.resultItem}
                        href={`/feed/profiles/${profile.source.publicSnapshotId}`}
                        key={profile.source.publicSnapshotId}
                      >
                        <span className={styles.resultAvatar}>
                          {profile.display.displayName.slice(0, 1)}
                        </span>
                        <span className={styles.resultCopy}>
                          <strong>{profile.display.displayName}</strong>
                          <small>{profile.display.profileName}</small>
                        </span>
                        <span className={styles.resultCode}>
                          {profile.display.code}
                        </span>
                      </Link>
                    ))}
                  </div>
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
            </>
          ) : (
            <div className={styles.emptyState}>
              <div>
                <span aria-hidden="true" className={styles.emptyMark}>
                  <Search size={22} />
                </span>
                <strong>
                  {isTagQuery
                    ? "일치하는 태그가 아직 없어요"
                    : "일치하는 공개 게시물이 없어요"}
                </strong>
                <p>
                  {isTagQuery
                    ? "# 뒤의 단어를 줄이거나 다른 태그를 입력해 보세요."
                    : "검색어를 줄이거나 뉴앙 코드 다섯 글자를 확인해 보세요."}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </CommunityScreenShell>
  );
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
