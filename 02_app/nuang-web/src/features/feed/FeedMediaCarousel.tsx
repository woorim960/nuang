"use client";

import { useRef, useState, type UIEvent } from "react";
import type { FeedPostMedia } from "@/features/feed/feed-seed";
import styles from "./FeedMediaCarousel.module.css";

export function FeedMediaCarousel({ media }: { media: FeedPostMedia[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const track = event.currentTarget;
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    setCurrentIndex(Math.max(0, Math.min(media.length - 1, index)));
  }

  if (media.length === 0) return null;

  return (
    <section
      aria-label={`게시물 사진 ${media.length}장`}
      className={styles.media}
    >
      <div className={styles.stage}>
        {media.length > 1 ? (
          <span className={styles.counter}>
            {currentIndex + 1} / {media.length}
          </span>
        ) : null}
        <div className={styles.track} onScroll={handleScroll} ref={trackRef}>
          {media.map((item) => (
            <figure className={styles.slide} key={item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={item.alt} src={item.url} />
            </figure>
          ))}
        </div>
      </div>
      {media.length > 1 && media.length <= 5 ? (
        <div aria-hidden="true" className={styles.dots}>
          {media.map((item, index) => (
            <span data-active={index === currentIndex} key={item.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
