"use client";

import { ScanSearch } from "lucide-react";
import {
  feedPostTopicCategories,
  feedPostTopicLabels,
  type FeedPostTopicCategory,
} from "@/features/feed/feed-topic";
import styles from "./FeedTopicSelector.module.css";

type FeedTopicSelectorProps = {
  canRecommend?: boolean;
  layout?: "embedded" | "full";
  note?: string | null;
  onChange: (category: FeedPostTopicCategory) => void;
  onRecommend?: () => void;
  recommending?: boolean;
  selectedCategory: FeedPostTopicCategory | null;
};

export function FeedTopicSelector({
  canRecommend = true,
  layout = "full",
  note,
  onChange,
  onRecommend,
  recommending = false,
  selectedCategory,
}: FeedTopicSelectorProps) {
  return (
    <section className={styles.section} data-layout={layout}>
      <div className={styles.heading}>
        <strong>주제</strong>
        {onRecommend ? (
          <button
            className={styles.recommendButton}
            disabled={!canRecommend}
            onClick={onRecommend}
            type="button"
          >
            <ScanSearch aria-hidden="true" size={15} />
            {recommending ? "추천 중" : "추천"}
          </button>
        ) : null}
      </div>

      <div
        aria-label="게시물 주제"
        className={styles.scroller}
        role="radiogroup"
      >
        {feedPostTopicCategories.map((category) => (
          <button
            aria-checked={selectedCategory === category}
            aria-label={`${feedPostTopicLabels[category]} 주제`}
            key={category}
            onClick={() => onChange(category)}
            role="radio"
            type="button"
          >
            {feedPostTopicLabels[category]}
          </button>
        ))}
      </div>

      {note ? <p className={styles.note}>{note}</p> : null}
    </section>
  );
}
