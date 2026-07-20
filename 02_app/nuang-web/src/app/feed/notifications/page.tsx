import { Bell, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CommunityScreenShell } from "@/features/feed/CommunityScreenShell";
import styles from "@/features/feed/CommunitySecondaryScreen.module.css";
import { readCommunityNotifications } from "@/features/feed/server-community-social";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "커뮤니티 알림 | NUANG",
};

export default async function CommunityNotificationsPage() {
  const result = await resolveNotifications();

  return (
    <CommunityScreenShell title="커뮤니티 알림">
      {result.state === "unavailable" ? (
        <section className={styles.emptyState}>
          <div>
            <span aria-hidden="true" className={styles.emptyMark}>
              <RefreshCw size={21} strokeWidth={1.7} />
            </span>
            <strong>알림을 불러오지 못했어요</strong>
            <p>연결을 확인한 뒤 다시 불러와 주세요.</p>
            <a className={styles.stateAction} href="/feed/notifications">
              다시 불러오기
            </a>
          </div>
        </section>
      ) : result.state === "unauthenticated" ? (
        <section className={styles.emptyState}>
          <div>
            <span aria-hidden="true" className={styles.emptyMark}>
              <Bell size={22} strokeWidth={1.7} />
            </span>
            <strong>로그인하면 소식을 모아볼 수 있어요</strong>
            <p>팔로우와 댓글처럼 나와 연결된 활동을 놓치지 않게 알려드려요.</p>
            <Link
              className={styles.stateAction}
              href="/login?next=%2Ffeed%2Fnotifications&reason=community"
            >
              로그인하기
            </Link>
          </div>
        </section>
      ) : result.notifications.length > 0 ? (
        <section className={styles.notificationList}>
          {result.notifications.map((notification) => (
            <Link
              className={styles.notificationItem}
              href={getNotificationHref(notification)}
              key={notification.id}
            >
              <span className={styles.notificationAvatar}>
                {notification.actorDisplayName.slice(0, 1)}
              </span>
              <div>
                <strong>{getNotificationTitle(notification)}</strong>
                <p>
                  {notification.previewText ?? "새로운 커뮤니티 활동이 있어요."}{" "}
                  · {formatTime(notification.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className={styles.emptyState}>
          <div>
            <span aria-hidden="true" className={styles.emptyMark}>
              <Bell size={22} />
            </span>
            <strong>새로운 활동이 아직 없어요</strong>
            <p>
              팔로우와 댓글, 답글, 언급처럼 커뮤니티 안에서 생긴 소식을 이곳에서
              확인할 수 있어요.
            </p>
          </div>
        </section>
      )}
    </CommunityScreenShell>
  );
}

async function resolveNotifications() {
  const [serverClient, serviceClient] = await Promise.all([
    createServerSupabaseClient(),
    Promise.resolve(createSupabaseServiceClient()),
  ]);

  if (!serverClient || !serviceClient) {
    return { notifications: [], state: "unavailable" as const };
  }

  const { data } = await serverClient.auth.getUser();
  if (!data.user) {
    return { notifications: [], state: "unauthenticated" as const };
  }

  return readCommunityNotifications({ client: serviceClient, user: data.user });
}

function getNotificationTitle(
  notification: Awaited<
    ReturnType<typeof resolveNotifications>
  >["notifications"][number],
) {
  const actor = notification.actorDisplayName;
  if (notification.eventType === "follow") return `${actor}님이 팔로우했어요.`;
  if (notification.eventType === "reply")
    return `${actor}님이 답글을 남겼어요.`;
  if (notification.eventType === "comment")
    return `${actor}님이 댓글을 남겼어요.`;
  if (notification.eventType === "mention")
    return `${actor}님이 회원님을 언급했어요.`;
  return `${actor}님이 게시물에 반응했어요.`;
}

function getNotificationHref(
  notification: Awaited<
    ReturnType<typeof resolveNotifications>
  >["notifications"][number],
) {
  if (notification.targetType === "public_profile") {
    return notification.actorPublicSnapshotId
      ? `/feed/profiles/${notification.actorPublicSnapshotId}`
      : "/feed";
  }
  if (notification.targetType === "feed_post") {
    return `/feed/posts/${notification.targetId}`;
  }
  return "/feed/notifications";
}

function formatTime(createdAt: string) {
  const time = new Date(createdAt).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
