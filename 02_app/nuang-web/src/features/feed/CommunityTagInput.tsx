"use client";

import { Hash, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  maxFeedTagCount,
  normalizeFeedTag,
} from "@/features/feed/feed-topic";
import styles from "./CommunityTagInput.module.css";

type CommunityTagInputProps = {
  disabled?: boolean;
  onChange: (tags: string[]) => void;
  onLimitReached?: () => void;
  tags: string[];
};

export function CommunityTagInput({
  disabled = false,
  onChange,
  onLimitReached,
  tags,
}: CommunityTagInputProps) {
  const [draft, setDraft] = useState("");
  const composingRef = useRef(false);

  function commitDraft(value = draft) {
    const candidates = value
      .split(/[\s,]+/)
      .map(normalizeFeedTag)
      .filter(Boolean);

    if (candidates.length === 0) {
      setDraft("");
      return;
    }

    const next = [...tags];
    for (const candidate of candidates) {
      const duplicate = next.some(
        (tag) =>
          tag.toLocaleLowerCase("ko-KR") ===
          candidate.toLocaleLowerCase("ko-KR"),
      );
      if (duplicate) continue;
      if (next.length >= maxFeedTagCount) {
        onLimitReached?.();
        break;
      }
      next.push(candidate);
    }

    onChange(next);
    setDraft("");
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <Hash aria-hidden="true" size={17} strokeWidth={1.8} />
          <strong>태그</strong>
        </div>
        <small>
          선택 · {tags.length}/{maxFeedTagCount}
        </small>
      </div>

      <div className={styles.inputRow}>
        <span aria-hidden="true">#</span>
        <input
          aria-label="태그 추가"
          autoCapitalize="none"
          disabled={disabled}
          enterKeyHint="done"
          maxLength={21}
          onBlur={(event) => {
            if (!composingRef.current) {
              commitDraft(event.currentTarget.value);
            }
          }}
          onChange={(event) => {
            setDraft(event.target.value.replace(/^#+/, ""));
          }}
          onCompositionEnd={(event) => {
            composingRef.current = false;
            setDraft(event.currentTarget.value.replace(/^#+/, ""));
          }}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onKeyDown={(event) => {
            if (
              composingRef.current ||
              event.nativeEvent.isComposing
            ) {
              return;
            }
            if (
              event.key === "Enter" ||
              event.key === "," ||
              event.key === " "
            ) {
              event.preventDefault();
              commitDraft(event.currentTarget.value);
            }
          }}
          placeholder="태그 추가"
          value={draft}
        />
      </div>

      {tags.length > 0 ? (
        <div aria-label="추가한 태그" className={styles.chips}>
          {tags.map((tag) => (
            <button
              aria-label={`${tag} 태그 삭제`}
              disabled={disabled}
              key={tag}
              onClick={() =>
                onChange(tags.filter((currentTag) => currentTag !== tag))
              }
              type="button"
            >
              <span>#{tag}</span>
              <X aria-hidden="true" size={12} strokeWidth={2} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
