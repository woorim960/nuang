"use client";

import { ArrowLeftRight, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "@/features/onboarding/OnboardingGuideCarousel.module.css";
import {
  markOnboardingCompleted,
  onboardingEntryContract,
} from "@/features/onboarding/onboarding-storage";

const guideSlides = [
  {
    alt: "나를 이해하고 서로를 이해하는 성향 놀이터. 간단한 질문에 답하면 나의 성향과 특징을 쉽게 확인할 수 있어요.",
    id: "G01",
    label: "성향 놀이터 소개",
    src: "/assets/onboarding/nuang-guide-01-playground-v3.jpg",
  },
  {
    alt: "내 성향을 5글자 뉴앙 코드로 확인해요. 검사를 진행할수록 결과가 쌓이고, 모인 결과를 종합해 내 성향을 더 자세히 알려드려요. 예시 코드는 ENAKQ예요.",
    id: "G02",
    label: "5글자 뉴앙 코드 소개",
    src: "/assets/onboarding/nuang-guide-02-code-v2.png",
  },
  {
    alt: "원하는 사람들과 성향을 비교하고 더 좋은 관계를 만들어가요. 가족, 친구, 연인과의 공통점과 차이점을 살펴볼 수 있어요.",
    id: "G03",
    label: "성향 비교 소개",
    src: "/assets/onboarding/nuang-guide-03-relationships-v1.jpg",
  },
  {
    alt: "3분 빠른 코어 검사로 시작해요. 로그인 없이 간단한 질문에 답하면 나의 첫 성향 결과를 바로 확인할 수 있어요.",
    id: "G04",
    label: "빠른 코어 검사 안내",
    src: "/assets/onboarding/nuang-guide-04-quick-core-v1.jpg",
  },
] as const;

type MouseDragState = {
  pointerId: number;
  startScrollLeft: number;
  startX: number;
};

export function OnboardingGuideCarousel() {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseDragRef = useRef<MouseDragState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === guideSlides.length - 1;

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  function goToSlide(index: number) {
    const safeIndex = Math.min(guideSlides.length - 1, Math.max(0, index));
    const track = trackRef.current;

    setActiveIndex(safeIndex);
    track?.scrollTo?.({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      left: safeIndex * track.clientWidth,
    });
  }

  function updateActiveSlide(event: UIEvent<HTMLDivElement>) {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const track = event.currentTarget;
    animationFrameRef.current = requestAnimationFrame(() => {
      if (track.clientWidth <= 0) return;
      const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
      setActiveIndex(Math.min(guideSlides.length - 1, Math.max(0, nextIndex)));
    });
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    goToSlide(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
  }

  function startMouseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    const track = event.currentTarget;
    mouseDragRef.current = {
      pointerId: event.pointerId,
      startScrollLeft: track.scrollLeft,
      startX: event.clientX,
    };
    track.dataset.dragging = "true";
    track.setPointerCapture?.(event.pointerId);
    track.focus({ preventScroll: true });
    event.preventDefault();
  }

  function continueMouseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = mouseDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.scrollLeft =
      drag.startScrollLeft + drag.startX - event.clientX;
  }

  function finishMouseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = mouseDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const track = event.currentTarget;
    mouseDragRef.current = null;
    delete track.dataset.dragging;
    track.releasePointerCapture?.(event.pointerId);

    if (track.clientWidth > 0) {
      goToSlide(Math.round(track.scrollLeft / track.clientWidth));
    }
  }

  function startQuickCore() {
    try {
      markOnboardingCompleted();
    } catch {
      // Storage availability should not prevent the assessment from starting.
    }

    router.replace(onboardingEntryContract.quickCoreDestination);
  }

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <span className={styles.wordmark}>NUANG</span>
        <span
          aria-label={`전체 ${guideSlides.length}개 중 ${activeIndex + 1}번째 가이드`}
          aria-live="polite"
          className={styles.count}
        >
          {activeIndex + 1} / {guideSlides.length}
        </span>
      </header>

      <section aria-label="뉴앙 서비스 가이드" className={styles.stage}>
        <div className={styles.glow} />
        <div
          aria-label="좌우 방향키 또는 손가락으로 넘기는 서비스 가이드"
          className={styles.track}
          onKeyDown={handleKeyboard}
          onPointerCancel={finishMouseDrag}
          onPointerDown={startMouseDrag}
          onPointerMove={continueMouseDrag}
          onPointerUp={finishMouseDrag}
          onScroll={updateActiveSlide}
          ref={trackRef}
          role="region"
          tabIndex={0}
        >
          {guideSlides.map((slide, index) => (
            <article
              aria-label={`${index + 1}. ${slide.label}`}
              aria-roledescription="슬라이드"
              className={styles.slide}
              key={slide.id}
            >
              <div className={styles.imageFrame}>
                <Image
                  alt={slide.alt}
                  className={styles.image}
                  draggable={false}
                  fill
                  priority={index <= 1}
                  sizes="(max-width: 520px) calc(100vw - 32px), 488px"
                  src={slide.src}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div aria-label="가이드 진행 위치" className={styles.pagination}>
          {guideSlides.map((slide, index) => (
            <button
              aria-current={activeIndex === index ? "step" : undefined}
              aria-label={`${index + 1}번째 ${slide.label} 보기`}
              className={activeIndex === index ? styles.activeDot : undefined}
              key={slide.id}
              onClick={() => goToSlide(index)}
              type="button"
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className={styles.actionSlot}>
          {isLastSlide ? (
            <button
              className={styles.startButton}
              onClick={startQuickCore}
              type="button"
            >
              빠른 코어 검사 시작하기
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.9} />
            </button>
          ) : (
            <p className={styles.swipeHint}>
              <ArrowLeftRight aria-hidden="true" size={16} strokeWidth={1.8} />
              좌우로 넘겨 다음 이야기를 확인해요
            </p>
          )}
        </div>
      </footer>
    </main>
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
