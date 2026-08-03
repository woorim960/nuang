"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type UIEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type GuideScene,
  OnboardingGuideScene,
} from "@/features/onboarding/OnboardingGuideScenes";
import styles from "@/features/onboarding/OnboardingGuideCarousel.module.css";
import { onboardingEntryContract } from "@/features/onboarding/onboarding-storage";
import {
  recordOnboardingCompleted,
  recordOnboardingSeen,
} from "@/features/onboarding/onboarding-sync";

const guideSlides = [
  {
    body: "네 글자만으로는 아쉬웠던 나를, 다섯 글자 뉴앙코드로 더 자세히 알아봐요.",
    eyebrow: "성향 놀이터, 뉴앙",
    id: "G01",
    label: "뉴앙 소개",
    scene: "welcome",
    title: (
      <>
        나를 이해하고,
        <br />
        서로를 이해하는 시작
      </>
    ),
  },
  {
    body: "다섯 가지 성향을 조합해 내 코드를 만들고, 생활에서 드러나는 특징까지 알려드려요.",
    eyebrow: "한 가지 유형보다 자세하게",
    id: "G02",
    label: "다섯 글자 뉴앙코드 소개",
    scene: "code",
    title: (
      <>
        생각·감정·관계 속
        <br />내 모습을 한눈에
      </>
    ),
  },
  {
    body: "친구·연인·가족과 결과를 비교해, 잘 맞는 점과 서로 배려할 점을 알아봐요.",
    eyebrow: "다름을 알면 오해가 줄어요",
    id: "G03",
    label: "관계 비교 소개",
    scene: "together",
    title: (
      <>
        가까운 사람과
        <br />
        더 잘 지내는 방법
      </>
    ),
  },
  {
    body: "로그인 없이 바로 시작할 수 있어요. 로그인하면 다른 기기에서도 결과를 이어볼 수 있어요.",
    eyebrow: "첫 결과까지 약 3~5분",
    id: "G04",
    label: "첫 검사 시작 안내",
    scene: "start",
    title: (
      <>
        가볍게 답하고,
        <br />
        내 첫 결과를 확인해요
      </>
    ),
  },
] as const satisfies readonly {
  body: string;
  eyebrow: string;
  id: string;
  label: string;
  scene: GuideScene;
  title: ReactNode;
}[];

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
  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === guideSlides.length - 1;

  useEffect(() => {
    recordOnboardingSeen();
  }, []);

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

  function completeOnboarding(destination: string) {
    try {
      recordOnboardingCompleted();
    } catch {
      // First-party storage availability must not block the next destination.
    }
    router.replace(destination);
  }

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <span className={styles.wordmark}>NUANG</span>
        <button
          className={styles.skipButton}
          onClick={() =>
            completeOnboarding(onboardingEntryContract.completedDestination)
          }
          type="button"
        >
          건너뛰기
        </button>
      </header>

      <nav aria-label="온보딩 진행" className={styles.progress}>
        {guideSlides.map((slide, index) => (
          <button
            aria-current={activeIndex === index ? "step" : undefined}
            aria-label={`${index + 1}번째 ${slide.label} 보기`}
            key={slide.id}
            onClick={() => goToSlide(index)}
            type="button"
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </nav>

      <section aria-label="뉴앙 서비스 가이드" className={styles.stage}>
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
          {guideSlides.map((slide, index) => {
            const active = activeIndex === index;
            return (
              <article
                aria-hidden={!active}
                aria-label={`${index + 1}. ${slide.label}`}
                aria-roledescription="슬라이드"
                className={styles.slide}
                data-scene={slide.scene}
                inert={!active}
                key={slide.id}
              >
                <OnboardingGuideScene active={active} scene={slide.scene} />
                <div className={styles.copy}>
                  <p className={styles.eyebrow}>{slide.eyebrow}</p>
                  {active ? <h1>{slide.title}</h1> : <h2>{slide.title}</h2>}
                  <p className={styles.body}>{slide.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <p aria-live="polite" className={styles.srOnly} role="status">
        전체 {guideSlides.length}개 중 {activeIndex + 1}번째 가이드
      </p>

      <footer className={styles.footer}>
        <div className={styles.actions} data-first={isFirstSlide}>
          {!isFirstSlide ? (
            <button
              className={styles.previousButton}
              onClick={() => goToSlide(activeIndex - 1)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.9} />
              이전
            </button>
          ) : null}

          {isLastSlide ? (
            <button
              className={styles.primaryButton}
              onClick={() =>
                completeOnboarding(onboardingEntryContract.quickCoreDestination)
              }
              type="button"
            >
              내 뉴앙코드 알아보기
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.9} />
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              onClick={() => goToSlide(activeIndex + 1)}
              type="button"
            >
              다음
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.9} />
            </button>
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
