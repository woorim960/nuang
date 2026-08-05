"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ProductAnalyticsArea } from "@/features/consent/optional-consent-contract";

export {
  productAnalyticsAreas,
  type ProductAnalyticsArea,
} from "@/features/consent/optional-consent-contract";

export function ProductAnalyticsBoundary() {
  const pathname = usePathname();
  const lastEventKey = useRef("");

  useEffect(() => {
    const area = resolveProductAnalyticsArea(pathname);
    if (!area || isProductAnalyticsTrackingDisabled()) return;

    const eventKey = `${pathname}:${area}`;
    if (lastEventKey.current === eventKey) return;
    let cancelled = false;
    let idleCallbackId: number | null = null;
    let fallbackTimerId: number | null = null;

    const send = () => {
      if (
        cancelled ||
        lastEventKey.current === eventKey ||
        isProductAnalyticsTrackingDisabled()
      ) {
        return;
      }
      lastEventKey.current = eventKey;
      void fetch("/api/analytics/events", {
        body: JSON.stringify({ area, eventName: "screen_view" }),
        cache: "no-store",
        headers: { "content-type": "application/json" },
        keepalive: true,
        method: "POST",
      }).catch(() => {
        // Analytics must never interrupt the product experience.
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(send, { timeout: 1_500 });
    } else {
      fallbackTimerId = window.setTimeout(send, 700);
    }

    return () => {
      cancelled = true;
      if (idleCallbackId !== null) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
      }
    };
  }, [pathname]);

  return null;
}

export function isProductAnalyticsTrackingDisabled() {
  const navigatorWithPrivacySignals = navigator as Navigator & {
    globalPrivacyControl?: boolean;
  };
  const windowWithDnt = window as Window & { doNotTrack?: string | null };
  return (
    navigator.doNotTrack === "1" ||
    windowWithDnt.doNotTrack === "1" ||
    navigatorWithPrivacySignals.globalPrivacyControl === true
  );
}

export function resolveProductAnalyticsArea(
  pathname: string,
): ProductAnalyticsArea | null {
  if (
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/policies")
  ) {
    return null;
  }
  if (pathname.startsWith("/my/settings")) return "settings";
  if (pathname.startsWith("/my")) return "my";
  if (
    pathname.startsWith("/assessments/together") ||
    pathname.startsWith("/together")
  ) {
    return "together";
  }
  if (
    pathname.startsWith("/results") ||
    pathname.includes("/result/")
  ) {
    return "result";
  }
  if (pathname.startsWith("/assessments")) return "assessment";
  if (
    pathname.startsWith("/community") ||
    pathname.startsWith("/feed")
  ) {
    return "community";
  }
  if (
    pathname.startsWith("/trait-map") ||
    pathname.startsWith("/map")
  ) {
    return "trait_map";
  }
  if (pathname.startsWith("/home")) return "home";
  return "other";
}
