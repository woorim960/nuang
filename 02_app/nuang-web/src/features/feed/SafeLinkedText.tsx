import type { ReactNode } from "react";
import {
  extractExternalLinks,
  type FeedExternalLink,
} from "@/features/feed/link-safety";
import styles from "./SafeLinkedText.module.css";

export function SafeLinkedText({
  as: Component = "p",
  className,
  links = [],
  text,
}: {
  as?: "p" | "span";
  className?: string;
  links?: FeedExternalLink[];
  text: string;
}) {
  const extracted = extractExternalLinks(text);

  if (extracted.length === 0) {
    return <Component className={className}>{text}</Component>;
  }

  const storedByUrl = new Map(
    links.map((link) => [link.normalizedUrl, link] as const),
  );
  const content: ReactNode[] = [];
  let cursor = 0;

  extracted.forEach((link, index) => {
    if (link.start > cursor) {
      content.push(text.slice(cursor, link.start));
    }

    const stored = storedByUrl.get(link.normalizedUrl);
    const status = stored?.status ?? link.status;

    if (status === "trusted" || status === "approved") {
      content.push(
        <a
          className={styles.link}
          href={link.normalizedUrl}
          key={`${link.normalizedUrl}-${index}`}
          rel="noopener noreferrer nofollow ugc"
          target="_blank"
        >
          {link.originalUrl}
        </a>,
      );
    } else {
      content.push(
        <span
          aria-label={
            status === "blocked"
              ? `${link.hostname} 링크는 열 수 없습니다`
              : `${link.hostname} 링크는 안전 확인 중입니다`
          }
          className={status === "blocked" ? styles.blocked : styles.pending}
          key={`${link.normalizedUrl}-${index}`}
          title={
            status === "blocked"
              ? "열 수 없는 링크"
              : "안전 확인 후 열 수 있어요"
          }
        >
          {link.originalUrl}
          <small>{status === "blocked" ? "열 수 없음" : "확인 중"}</small>
        </span>,
      );
    }

    cursor = link.end;
  });

  if (cursor < text.length) content.push(text.slice(cursor));

  return <Component className={className}>{content}</Component>;
}
