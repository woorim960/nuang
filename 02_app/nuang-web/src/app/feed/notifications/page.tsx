import { Bell } from "lucide-react";
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
  const notifications = await resolveNotifications();

  return (
    <CommunityScreenShell title="커뮤니티 알림">
      {notifications.length > 0 ? (
        <section className={styles.notificationList}>
          {notifications.map((notification) => (
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

  if (!serverClient || !serviceClient) return [];

  const { data } = await serverClient.auth.getUser();
  if (!data.user) return [];

  return readCommunityNotifications({ client: serviceClient, user: data.user });
}

function getNotificationTitle(
  notification: Awaited<ReturnType<typeof resolveNotifications>>[number],
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
  notification: Awaited<ReturnType<typeof resolveNotifications>>[number],
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
