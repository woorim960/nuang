"use client";

import { ArrowLeft, Ban, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  BlockedProfile,
  BlockedProfilesResponse,
} from "@/features/account/blocked-profile-contract";
import { PublicProfileImageView } from "@/features/public-profile/PublicProfileImageView";
import styles from "./BlockedProfilesScreen.module.css";

type ScreenState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { message: string; status: "error" }
  | { blockedProfiles: BlockedProfile[]; status: "ready" };

export function BlockedProfilesScreen() {
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setNotice(null);
    setState(await requestBlockedProfiles());
  }, []);

  useEffect(() => {
    let active = true;

    void requestBlockedProfiles().then((nextState) => {
      if (active) setState(nextState);
    });

    return () => {
      active = false;
    };
  }, []);

  async function unblock(profile: BlockedProfile) {
    if (pendingAccountId) return;

    setPendingAccountId(profile.blockedAccountId);
    setNotice(null);

    try {
      const response = await fetch("/api/community/blocks", {
        body: JSON.stringify({ blockedAccountId: profile.blockedAccountId }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok) {
        setNotice(payload?.message ?? "차단을 해제하지 못했어요.");
        return;
      }

      setState((current) =>
        current.status === "ready"
          ? {
              blockedProfiles: current.blockedProfiles.filter(
                (item) => item.blockedAccountId !== profile.blockedAccountId,
              ),
              status: "ready",
            }
          : current,
      );
      setNotice(`${profile.displayName}님의 차단을 해제했어요.`);
    } catch {
      setNotice("연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPendingAccountId(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="설정으로 돌아가기" href="/my/settings">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <p>차단한 프로필</p>
        <span aria-hidden="true" />
      </header>

      <section className={styles.intro}>
        <span className={styles.introMark}>
          <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.7} />
        </span>
        <div>
          <h1>내 커뮤니티를 편안하게 관리해요</h1>
          <p>
            차단한 사람과는 서로의 프로필과 게시물이 보이지 않아요. 차단 사실은
            상대에게 알리지 않아요.
          </p>
        </div>
      </section>

      {state.status === "loading" ? (
        <BlockedProfilesLoading />
      ) : state.status === "unauthenticated" ? (
        <StateMessage
          actionHref="/login?next=%2Fmy%2Fsettings%2Fblocked&reason=community"
          actionLabel="로그인하기"
          body="로그인하면 차단한 프로필을 확인하고 다시 보이게 할 수 있어요."
          title="로그인이 필요해요"
        />
      ) : state.status === "error" ? (
        <section className={styles.state}>
          <span aria-hidden="true" className={styles.stateMark}>
            <RefreshCw size={21} strokeWidth={1.7} />
          </span>
          <strong>목록을 불러오지 못했어요</strong>
          <p>{state.message}</p>
          <button onClick={() => void load()} type="button">
            다시 불러오기
          </button>
        </section>
      ) : state.blockedProfiles.length === 0 ? (
        <StateMessage
          body="필요할 때 상대 프로필의 더보기 메뉴에서 차단할 수 있어요."
          title="차단한 프로필이 없어요"
        />
      ) : (
        <section aria-label="차단한 프로필 목록" className={styles.list}>
          <p className={styles.listGuide}>
            차단을 해제하면 서로의 공개 프로필과 게시물을 다시 볼 수 있어요.
          </p>
          {state.blockedProfiles.map((profile) => (
            <article className={styles.item} key={profile.blockedAccountId}>
              <PublicProfileImageView image={profile.profileImage} size="md" />
              <div className={styles.itemCopy}>
                <strong>{profile.displayName}</strong>
                <span>
                  {[profile.code, profile.profileName]
                    .filter(Boolean)
                    .join(" · ") || "공개된 성향 정보가 없어요"}
                </span>
              </div>
              <button
                disabled={pendingAccountId !== null}
                onClick={() => void unblock(profile)}
                type="button"
              >
                {pendingAccountId === profile.blockedAccountId
                  ? "해제 중"
                  : "차단 해제"}
              </button>
            </article>
          ))}
        </section>
      )}

      {notice ? (
        <p aria-live="polite" className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}

async function requestBlockedProfiles(): Promise<ScreenState> {
  try {
    const response = await fetch("/api/community/blocks", {
      cache: "no-store",
      method: "GET",
    });

    if (response.status === 401) {
      return { status: "unauthenticated" };
    }

    const payload = (await response
      .json()
      .catch(() => null)) as BlockedProfilesResponse | null;

    if (!response.ok || !payload?.ok) {
      return {
        message:
          payload && !payload.ok
            ? payload.message
            : "차단한 프로필을 불러오지 못했어요.",
        status: "error",
      };
    }

    return { blockedProfiles: payload.blockedProfiles, status: "ready" };
  } catch {
    return {
      message: "연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
      status: "error",
    };
  }
}

function BlockedProfilesLoading() {
  return (
    <section
      aria-label="차단 목록 불러오는 중"
      className={styles.loading}
      role="status"
    >
      {[0, 1, 2].map((item) => (
        <div key={item}>
          <span />
          <p>
            <i />
            <i />
          </p>
          <em />
        </div>
      ))}
      <small>차단한 프로필을 불러오고 있어요.</small>
    </section>
  );
}

function StateMessage({
  actionHref,
  actionLabel,
  body,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  body: string;
  title: string;
}) {
  return (
    <section className={styles.state}>
      <span aria-hidden="true" className={styles.stateMark}>
        <Ban size={21} strokeWidth={1.7} />
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref}>{actionLabel}</Link>
      ) : null}
    </section>
  );
}
