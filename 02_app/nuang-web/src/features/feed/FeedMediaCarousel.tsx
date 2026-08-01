"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
} from "react";
import type { FeedPostMedia } from "@/features/feed/feed-seed";
import styles from "./FeedMediaCarousel.module.css";

export function FeedMediaCarousel({ media }: { media: FeedPostMedia[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startScrollLeft: number;
    startX: number;
  } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const track = event.currentTarget;
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    setCurrentIndex(Math.max(0, Math.min(media.length - 1, index)));
  }

  function startMouseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (media.length < 2 || event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startScrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  }

  function moveMouseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.currentTarget.scrollLeft =
      drag.startScrollLeft - (event.clientX - drag.startX);
  }

  function finishMouseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const track = event.currentTarget;
    const index = Math.max(
      0,
      Math.min(
        media.length - 1,
        Math.round(track.scrollLeft / Math.max(1, track.clientWidth)),
      ),
    );
    const nextLeft = index * track.clientWidth;

    if (typeof track.scrollTo === "function") {
      track.scrollTo({ behavior: "smooth", left: nextLeft });
    } else {
      track.scrollLeft = nextLeft;
    }
    if (track.hasPointerCapture?.(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
    setCurrentIndex(index);
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
        <div
          aria-label="사진 넘겨보기"
          className={styles.track}
          data-dragging={dragging ? "true" : "false"}
          onPointerCancel={finishMouseDrag}
          onPointerDown={startMouseDrag}
          onPointerMove={moveMouseDrag}
          onPointerUp={finishMouseDrag}
          onScroll={handleScroll}
          ref={trackRef}
          role="group"
        >
          {media.map((item) => (
            <figure className={styles.slide} key={item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={item.alt}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                src={item.url}
              />
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
