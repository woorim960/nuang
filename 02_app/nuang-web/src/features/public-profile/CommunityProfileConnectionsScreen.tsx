"use client";

import { RefreshCw, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CommunityProfileConnection,
  CommunityProfileConnectionsResult,
} from "@/features/feed/community-social-contract";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import styles from "./CommunityProfileConnectionsScreen.module.css";

export type CommunityConnectionTab = "followers" | "following";

export function CommunityProfileConnectionsScreen({
  activeTab,
  result,
}: {
  activeTab: CommunityConnectionTab;
  result: CommunityProfileConnectionsResult;
}) {
  const router = useRouter();
  const profileHref = `/feed/profiles/${result.ownerPublicSnapshotId}`;
  const activeConnections =
    activeTab === "followers" ? result.followers : result.following;

  return (
    <CommunityScreenShell
      backHref={profileHref}
      backLabel={`${result.ownerDisplayName}님의 프로필로 돌아가기`}
      title={result.ownerDisplayName}
    >
      <nav aria-label="팔로우 목록" className={styles.tabs}>
        <Link
          aria-current={activeTab === "followers" ? "page" : undefined}
          href={`${profileHref}/connections?tab=followers`}
        >
          팔로워 <span>{result.followers.length}</span>
        </Link>
        <Link
          aria-current={activeTab === "following" ? "page" : undefined}
          href={`${profileHref}/connections?tab=following`}
        >
          팔로잉 <span>{result.following.length}</span>
        </Link>
      </nav>

      {result.state === "unavailable" ? (
        <section className={styles.state}>
          <span aria-hidden="true" className={styles.stateMark}>
            <RefreshCw size={21} strokeWidth={1.7} />
          </span>
          <strong>목록을 불러오지 못했어요</strong>
          <p>연결을 확인한 뒤 다시 불러와 주세요.</p>
          <button onClick={() => router.refresh()} type="button">
            다시 불러오기
          </button>
        </section>
      ) : activeConnections.length > 0 ? (
        <section aria-live="polite" className={styles.list}>
          <p className={styles.guide}>
            {activeTab === "followers"
              ? `${result.ownerDisplayName}님의 이야기를 보고 있는 사람들이에요.`
              : `${result.ownerDisplayName}님이 소식을 보고 있는 사람들이에요.`}
          </p>
          {activeConnections.map((connection) => (
            <ConnectionItem
              connection={connection}
              key={connection.publicSnapshotId}
            />
          ))}
        </section>
      ) : (
        <section className={styles.state}>
          <span aria-hidden="true" className={styles.stateMark}>
            <UsersRound size={22} strokeWidth={1.65} />
          </span>
          <strong>
            {activeTab === "followers"
              ? "아직 팔로워가 없어요"
              : "아직 팔로우한 프로필이 없어요"}
          </strong>
          <p>
            {activeTab === "followers"
              ? "커뮤니티에서 이야기를 나누면 새로운 연결이 시작될 수 있어요."
              : "마음에 드는 이야기를 발견하면 프로필에서 팔로우해 보세요."}
          </p>
          <Link href="/feed">커뮤니티 둘러보기</Link>
        </section>
      )}
    </CommunityScreenShell>
  );
}

function ConnectionItem({
  connection,
}: {
  connection: CommunityProfileConnection;
}) {
  return (
    <Link
      aria-label={`${connection.displayName}님의 프로필 보기`}
      className={styles.item}
      href={`/feed/profiles/${connection.publicSnapshotId}`}
    >
      <PublicProfileImageView image={connection.profileImage} size="md" />
      <span className={styles.itemCopy}>
        <strong>{connection.displayName}</strong>
        <small>{connection.profileName}</small>
      </span>
      <span className={styles.code}>{connection.code}</span>
    </Link>
  );
}
