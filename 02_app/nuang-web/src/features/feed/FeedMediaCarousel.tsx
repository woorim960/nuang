"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
} from "react";
import type { FeedPostMedia } from "@/features/feed/feed-seed";
import styles from "./FeedMediaCarousel.module.css";

export function FeedMediaCarousel({
  media,
  priority = false,
}: {
  media: FeedPostMedia[];
  priority?: boolean;
}) {
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
          {media.map((item, index) => (
            <figure className={styles.slide} key={item.id}>
              <DeferredFeedImage
                defer={index > 0}
                item={item}
                priority={priority && index === 0}
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

function DeferredFeedImage({
  defer,
  item,
  priority,
}: {
  defer: boolean;
  item: FeedPostMedia;
  priority: boolean;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(priority || !defer);
  const shouldLoad = priority || visible;

  useEffect(() => {
    if (shouldLoad) return;

    const image = imageRef.current;
    if (!image) return;

    if (typeof IntersectionObserver === "undefined") {
      const timeout = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    // Keep every card's first image in the server-rendered HTML so hydration
    // delays and expiring signed URLs cannot leave the feed blank. Only later
    // carousel slides wait until they approach the viewport.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={item.alt}
      decoding="async"
      draggable={false}
      fetchPriority={priority ? "high" : "low"}
      height={item.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      onDragStart={(event) => event.preventDefault()}
      ref={imageRef}
      src={shouldLoad ? getOptimizedFeedImageUrl(item.url) : undefined}
      width={item.width ?? undefined}
    />
  );
}

function getOptimizedFeedImageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "images.unsplash.com") {
      return value;
    }
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("q", "76");
    url.searchParams.set("w", "960");
    return url.toString();
  } catch {
    return value;
  }
}
