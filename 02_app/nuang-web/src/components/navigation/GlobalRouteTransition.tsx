"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NuangRouteLoadingScreen } from "@/components/navigation/NuangRouteLoadingScreen";

const standardMinimumVisibleDuration = 420;
const communityMinimumVisibleDuration = 100;
const communityLoadingDelay = 180;
const safetyTimeoutDuration = 10_000;

type NavigationEventLike = Event & {
  destination?: { url?: string };
};

type BrowserNavigation = EventTarget;

export function GlobalRouteTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [isVisible, setIsVisible] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const programmaticStartTimerRef = useRef<number | null>(null);
  const minimumVisibleDurationRef = useRef(standardMinimumVisibleDuration);

  const clearTimer = useCallback((timerRef: { current: number | null }) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const beginTransition = useCallback(
    (minimumVisibleDuration: number) => {
      clearTimer(hideTimerRef);
      clearTimer(safetyTimerRef);
      minimumVisibleDurationRef.current = minimumVisibleDuration;
      startedAtRef.current = window.performance.now();
      setIsVisible(true);
      safetyTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        safetyTimerRef.current = null;
      }, safetyTimeoutDuration);
    },
    [clearTimer],
  );

  const finishTransition = useCallback(() => {
    if (startedAtRef.current === null) return;

    clearTimer(hideTimerRef);
    clearTimer(safetyTimerRef);

    const elapsed = window.performance.now() - startedAtRef.current;
    const remaining = Math.max(0, minimumVisibleDurationRef.current - elapsed);

    hideTimerRef.current = window.setTimeout(() => {
      startedAtRef.current = null;
      setIsVisible(false);
      hideTimerRef.current = null;
    }, remaining);
  }, [clearTimer]);

  useEffect(() => {
    clearTimer(programmaticStartTimerRef);
    finishTransition();
  }, [clearTimer, finishTransition, routeKey]);

  useEffect(() => {
    const shouldShowForUrl = (destination: string) => {
      const nextUrl = new URL(destination, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) return false;

      return (
        nextUrl.pathname !== currentUrl.pathname ||
        nextUrl.search !== currentUrl.search
      );
    };

    const scheduleTransition = (destination: string) => {
      if (
        startedAtRef.current !== null ||
        programmaticStartTimerRef.current !== null
      ) {
        return;
      }

      const nextUrl = new URL(destination, window.location.href);
      const isCommunityRoute =
        nextUrl.pathname === "/feed" || nextUrl.pathname.startsWith("/feed/");
      programmaticStartTimerRef.current = window.setTimeout(
        () => {
          programmaticStartTimerRef.current = null;
          if (startedAtRef.current !== null) return;
          beginTransition(
            isCommunityRoute
              ? communityMinimumVisibleDuration
              : standardMinimumVisibleDuration,
          );
        },
        isCommunityRoute ? communityLoadingDelay : 0,
      );
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.download ||
        anchor.target === "_blank" ||
        anchor.dataset.routeLoading === "off"
      ) {
        return;
      }

      if (shouldShowForUrl(anchor.href)) scheduleTransition(anchor.href);
    };

    const handlePopState = () => scheduleTransition(window.location.href);
    const handleNavigate = (event: Event) => {
      const destination = (event as NavigationEventLike).destination?.url;
      if (
        !destination ||
        !shouldShowForUrl(destination) ||
        startedAtRef.current !== null
      ) {
        return;
      }

      scheduleTransition(destination);
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    const browserNavigation = (
      window as Window & { navigation?: BrowserNavigation }
    ).navigation;
    browserNavigation?.addEventListener("navigate", handleNavigate);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      browserNavigation?.removeEventListener("navigate", handleNavigate);
      clearTimer(hideTimerRef);
      clearTimer(safetyTimerRef);
      clearTimer(programmaticStartTimerRef);
    };
  }, [beginTransition, clearTimer, finishTransition]);

  if (!isVisible) return null;

  return <NuangRouteLoadingScreen overlay />;
}
