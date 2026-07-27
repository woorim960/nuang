"use client";

import { Ban, Check, Copy, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import type { AdminExternalLink } from "./server-admin-community";
import styles from "./AdminExternalLinkReview.module.css";

type LinkAction =
  "approve_domain" | "approve_link" | "block_domain" | "block_link";

export function AdminExternalLinkReview({
  links,
}: {
  links: AdminExternalLink[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<{
    action: Extract<LinkAction, "approve_domain" | "block_domain">;
    link: AdminExternalLink;
  } | null>(null);

  async function run(link: AdminExternalLink, action: LinkAction) {
    const pendingKey = `${link.id}:${action}`;
    setPending(pendingKey);
    setMessage("");
    const response = await fetch("/api/admin/community/links", {
      body: JSON.stringify({ action, id: link.id }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
    } | null;

    if (!response.ok || !payload?.ok) {
      setMessage(payload?.message ?? "링크 검토 결과를 저장하지 못했습니다.");
      setPending(null);
      return;
    }

    setPending(null);
    setConfirmation(null);
    router.refresh();
  }

  return (
    <div className={styles.wrap}>
      {links.map((link) => (
        <article className={styles.item} key={link.id}>
          <header>
            <div>
              <strong>{link.hostname}</strong>
              <span>
                {link.authorName} ·{" "}
                {link.contentType === "post" ? "게시물" : "댓글"}
              </span>
            </div>
            <time>{formatDateTime(link.createdAt)}</time>
          </header>

          <div className={styles.urlRow}>
            <code>{link.originalUrl}</code>
            <button
              aria-label="링크 주소 복사"
              onClick={() => navigator.clipboard?.writeText(link.normalizedUrl)}
              type="button"
            >
              <Copy aria-hidden="true" size={15} strokeWidth={1.8} />
            </button>
          </div>
          {link.contentPreview ? (
            <p>{truncate(link.contentPreview, 180)}</p>
          ) : null}

          <div className={styles.actions}>
            <button
              disabled={Boolean(pending)}
              onClick={() => run(link, "approve_link")}
              type="button"
            >
              <Check aria-hidden="true" size={15} strokeWidth={1.9} />이 링크
              허용
            </button>
            <button
              disabled={Boolean(pending)}
              onClick={() =>
                setConfirmation({ action: "approve_domain", link })
              }
              type="button"
            >
              <ShieldCheck aria-hidden="true" size={15} strokeWidth={1.8} />
              도메인 신뢰
            </button>
            <button
              className={styles.danger}
              disabled={Boolean(pending)}
              onClick={() => run(link, "block_link")}
              type="button"
            >
              <Ban aria-hidden="true" size={15} strokeWidth={1.8} />
              링크 차단
            </button>
            <button
              className={styles.danger}
              disabled={Boolean(pending)}
              onClick={() => setConfirmation({ action: "block_domain", link })}
              type="button"
            >
              도메인 차단
            </button>
          </div>
        </article>
      ))}
      {message ? (
        <p className={styles.message} role="alert">
          {message}
        </p>
      ) : null}
      <AdminConfirmDialog
        confirmLabel={
          confirmation?.action === "block_domain"
            ? "도메인 차단"
            : "도메인 신뢰"
        }
        description={
          confirmation?.action === "block_domain"
            ? `${confirmation.link.hostname}의 링크를 차단하고 같은 도메인의 게시 대기 링크도 함께 닫습니다.`
            : confirmation
              ? `${confirmation.link.hostname}을 신뢰 목록에 추가하고 같은 도메인의 게시 대기 링크를 허용합니다.`
              : ""
        }
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation) {
            void run(confirmation.link, confirmation.action);
          }
        }}
        open={Boolean(confirmation)}
        pending={Boolean(pending)}
        title={
          confirmation?.action === "block_domain"
            ? "이 도메인을 차단할까요?"
            : "이 도메인을 신뢰할까요?"
        }
        tone={confirmation?.action === "block_domain" ? "danger" : "brand"}
      />
    </div>
  );
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength).trimEnd()}…`
    : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "numeric",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date(value));
}
