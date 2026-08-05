import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AccountConnectPanel } from "@/features/consent/AccountConnectPanel";
import { createPrivatePageMetadata } from "@/features/seo/site-config";
import styles from "./page.module.css";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "로그인 또는 가입",
});

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    reason?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = searchParams ? await searchParams : {};
  const reason = readFirst(query.reason);
  const nextPath = readSafeNextPath(readFirst(query.next));
  const copy = getLoginCopy(reason);
  const isCommunityLogin = [
    "bookmark",
    "comment",
    "community",
    "follow",
    "poll",
    "post",
    "reaction",
  ].includes(reason);
  const backHref = createBackHref(nextPath);
  const backLabel =
    backHref === "/home" ? "홈으로 돌아가기" : "이전 화면으로 돌아가기";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label={backLabel} href={backHref}>
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <p>로그인 또는 가입</p>
        <span aria-hidden="true" />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>{copy.title}</h1>
          {copy.description ? <p>{copy.description}</p> : null}
        </div>
        <div className={styles.character}>
          <Image
            alt="반갑게 인사하는 뉴앙 캐릭터"
            height={104}
            priority
            src="/assets/characters/nuang-character-purple.webp"
            width={104}
          />
        </div>
      </section>

      <section className={styles.authSection}>
        <AccountConnectPanel
          context={isCommunityLogin ? "community" : "account"}
        />
      </section>

      <Link className={styles.backLink} href={backHref}>
        로그인 없이 돌아가기
      </Link>
    </main>
  );
}

function getLoginCopy(reason: string) {
  const reasonCopy: Record<string, { description: string; title: string }> = {
    bookmark: {
      description: "로그인 후 저장한 글에서 다시 볼 수 있어요.",
      title: "이 글을 저장하려면 로그인해 주세요",
    },
    comment: {
      description: "작성한 내용은 그대로 두고 로그인 후 이어갈게요.",
      title: "댓글을 남기려면 로그인해 주세요",
    },
    compare: {
      description: "로그인 후 선택한 사람과의 비교를 이어갑니다.",
      title: "나와 비교하려면 로그인해 주세요",
    },
    event: {
      description: "로그인 후 완료한 리뷰의 이벤트 응모를 바로 이어갈게요.",
      title: "이벤트에 응모하려면 로그인해 주세요",
    },
    research: {
      description: "로그인 후 지금 보려던 검사 질문 리뷰로 바로 돌아갈게요.",
      title: "검사 질문 리뷰는 로그인 후 참여할 수 있어요",
    },
    follow: {
      description: "로그인 후 보고 있던 프로필로 바로 돌아갑니다.",
      title: "팔로우하려면 로그인해 주세요",
    },
    poll: {
      description: "로그인 후 선택을 저장하고 결과를 바로 보여드려요.",
      title: "내 선택을 저장하려면 로그인해 주세요",
    },
    post: {
      description: "로그인 후 작성하던 글로 바로 돌아갑니다.",
      title: "글을 올리려면 로그인해 주세요",
    },
    reaction: {
      description: "로그인 후 방금 누른 반응을 이어갑니다.",
      title: "이 반응을 저장하려면 로그인해 주세요",
    },
    share: {
      description: "선택한 공유 방법을 유지한 채 이어갑니다.",
      title: "리포트를 공유하려면 로그인해 주세요",
    },
  };

  return (
    reasonCopy[reason] ?? {
      description: "",
      title: "로그인하고 뉴앙을 이어가요",
    }
  );
}

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readSafeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/my";
}

function createBackHref(nextPath: string) {
  const url = new URL(nextPath, "https://nuang.local");
  ["auth", "optionId", "pollId", "postId", "resumeFeed"].forEach((key) => {
    url.searchParams.delete(key);
  });
  return url.pathname + url.search;
}
