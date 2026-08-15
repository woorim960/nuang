"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { FeedPostMedia } from "@/features/feed/feed-seed";
import { useModalDialog } from "@/hooks/useModalDialog";
import styles from "./FeedMediaCarousel.module.css";

export function FeedMediaCarousel({
  media,
  priority = false,
}: {
  media: FeedPostMedia[];
  priority?: boolean;
}) {
  const carouselRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startScrollLeft: number;
    startX: number;
  } | null>(null);
  const suppressViewerOpenRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [requestedMediaIds, setRequestedMediaIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const closeViewer = useCallback(() => setViewerIndex(null), []);
  const viewerDialogRef = useModalDialog<HTMLDivElement>({
    onClose: closeViewer,
    open: viewerIndex !== null,
  });

  const requestCurrentAndNext = useCallback(
    (index: number) => {
      const ids = media
        .slice(index, Math.min(media.length, index + 2))
        .map((item) => item.id);
      if (ids.length === 0) return;

      setRequestedMediaIds((current) => {
        if (ids.every((id) => current.has(id))) return current;
        const next = new Set(current);
        ids.forEach((id) => next.add(id));
        return next;
      });
    },
    [media],
  );

  useEffect(() => {
    if (media.length < 2 || nearViewport) return;

    const carousel = carouselRef.current;
    if (!carousel) return;

    if (typeof IntersectionObserver === "undefined") {
      const timeout = window.setTimeout(() => {
        setNearViewport(true);
        requestCurrentAndNext(currentIndex);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNearViewport(true);
        requestCurrentAndNext(currentIndex);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(carousel);
    return () => observer.disconnect();
  }, [currentIndex, media.length, nearViewport, requestCurrentAndNext]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const track = event.currentTarget;
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    const boundedIndex = Math.max(0, Math.min(media.length - 1, index));
    setCurrentIndex(boundedIndex);
    if (nearViewport) requestCurrentAndNext(boundedIndex);
  }

  function startMouseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      media.length < 2 ||
      event.pointerType !== "mouse" ||
      event.button !== 0
    ) {
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
    if (nearViewport) requestCurrentAndNext(index);

    const moved =
      Math.abs(event.clientX - drag.startX) > 6 ||
      Math.abs(track.scrollLeft - drag.startScrollLeft) > 6;
    if (moved) {
      suppressViewerOpenRef.current = true;
      window.setTimeout(() => {
        suppressViewerOpenRef.current = false;
      }, 0);
    }
  }

  function openViewer(index: number) {
    if (suppressViewerOpenRef.current) {
      suppressViewerOpenRef.current = false;
      return;
    }
    setViewerIndex(index);
  }

  function moveViewer(direction: -1 | 1) {
    setViewerIndex((index) => {
      if (index === null) return null;
      return (index + direction + media.length) % media.length;
    });
  }

  function handleViewerKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveViewer(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveViewer(1);
    }
  }

  if (media.length === 0) return null;

  const viewerItem = viewerIndex === null ? null : (media[viewerIndex] ?? null);

  return (
    <section
      aria-label={`게시물 사진 ${media.length}장`}
      className={styles.media}
      ref={carouselRef}
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
              <button
                aria-haspopup="dialog"
                aria-label={`사진 ${index + 1} 크게 보기${item.alt ? `: ${item.alt}` : ""}`}
                className={styles.imageButton}
                onClick={() => openViewer(index)}
                tabIndex={index === currentIndex ? 0 : -1}
                type="button"
              >
                <DeferredFeedImage
                  item={item}
                  load={index === 0 || requestedMediaIds.has(item.id)}
                  priority={priority && index === 0}
                />
              </button>
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
      {viewerItem
        ? createPortal(
            <div
              className={styles.viewerBackdrop}
              data-modal-layer="true"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeViewer();
              }}
            >
              <div
                aria-label="사진 크게 보기"
                aria-modal="true"
                className={styles.viewerDialog}
                onKeyDown={handleViewerKeyDown}
                ref={viewerDialogRef}
                role="dialog"
                tabIndex={-1}
              >
                <div className={styles.viewerToolbar}>
                  <span aria-atomic="true" aria-live="polite">
                    {viewerIndex! + 1} / {media.length}
                  </span>
                  <button
                    aria-label="사진 크게 보기 닫기"
                    className={styles.viewerClose}
                    data-modal-initial-focus="true"
                    onClick={closeViewer}
                    type="button"
                  >
                    <X aria-hidden="true" size={24} strokeWidth={2} />
                  </button>
                </div>
                <div className={styles.viewerImageFrame}>
                  {/* The card and viewer deliberately share this exact URL so
                      an already loaded image is reused from the browser cache. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={viewerItem.alt}
                    className={styles.viewerImage}
                    decoding="async"
                    draggable={false}
                    height={viewerItem.height ?? undefined}
                    src={getOptimizedFeedImageUrl(viewerItem.url)}
                    width={viewerItem.width ?? undefined}
                  />
                </div>
                {media.length > 1 ? (
                  <>
                    <button
                      aria-label="이전 사진 보기"
                      className={`${styles.viewerNav} ${styles.viewerPrevious}`}
                      onClick={() => moveViewer(-1)}
                      type="button"
                    >
                      <ChevronLeft
                        aria-hidden="true"
                        size={28}
                        strokeWidth={2}
                      />
                    </button>
                    <button
                      aria-label="다음 사진 보기"
                      className={`${styles.viewerNav} ${styles.viewerNext}`}
                      onClick={() => moveViewer(1)}
                      type="button"
                    >
                      <ChevronRight
                        aria-hidden="true"
                        size={28}
                        strokeWidth={2}
                      />
                    </button>
                  </>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function DeferredFeedImage({
  item,
  load,
  priority,
}: {
  item: FeedPostMedia;
  load: boolean;
  priority: boolean;
}) {
  return (
    // Keep every card's first image in the server-rendered HTML so hydration
    // delays cannot leave the feed blank. Later slides receive their src only
    // as the carousel approaches the viewport and each slide becomes next.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={item.alt}
      decoding="async"
      draggable={false}
      fetchPriority={priority ? "high" : "low"}
      height={item.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      onDragStart={(event) => event.preventDefault()}
      src={load ? getOptimizedFeedImageUrl(item.url) : undefined}
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
