"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { AdSenseDeliveryConfig } from "./advertising-delivery-contract";
import { reportAdvertisingEvent } from "./advertising-events";
import {
  canRequestAdvertising,
  recordAdvertisingImpression,
} from "./advertising-session";
import { AdFeedbackMenu } from "./AdFeedbackMenu";
import styles from "./AdvertisingDelivery.module.css";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>> & {
      requestNonPersonalizedAds?: number;
    };
  }
}

type SlotStatus = "checking" | "loading" | "filled" | "hidden";

export function AdSenseInlineSlot({
  config,
}: {
  config: AdSenseDeliveryConfig | null;
}) {
  const adRef = useRef<HTMLModElement>(null);
  const filledReportedRef = useRef(false);
  const initializedRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<SlotStatus>("checking");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!config?.enabled || !isApprovedRuntime(config.canonicalOrigin)) {
        setStatus("hidden");
        return;
      }
      if (
        !canRequestAdvertising({
          dailyCap: config.dailyCap,
          placementKey: config.placementKey,
          provider: "adsense",
          sessionCap: config.sessionCap,
        })
      ) {
        setStatus("hidden");
        return;
      }

      setStatus("loading");
      reportAdvertisingEvent({
        event: "ad_slot_eligible",
        placementKey: config.placementKey,
        provider: "adsense",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [config]);

  useEffect(() => {
    if (!config || status !== "loading" || !scriptReady) return;
    if (initializedRef.current || !adRef.current) return;
    initializedRef.current = true;

    try {
      const queue = (window.adsbygoogle = window.adsbygoogle || []);
      queue.requestNonPersonalizedAds = 1;
      queue.push({});
      reportAdvertisingEvent({
        event: "ad_render_requested",
        placementKey: config.placementKey,
        provider: "adsense",
      });
    } catch {
      window.setTimeout(() => setStatus("hidden"), 0);
      reportAdvertisingEvent({
        event: "ad_slot_error",
        placementKey: config.placementKey,
        provider: "adsense",
      });
    }
  }, [config, scriptReady, status]);

  useEffect(() => {
    const element = adRef.current;
    if (!config || !element || status === "hidden") return;
    const timeout = window.setTimeout(() => {
      if (!filledReportedRef.current) {
        setStatus("hidden");
        reportAdvertisingEvent({
          event: "ad_slot_no_fill",
          placementKey: config.placementKey,
          provider: "adsense",
        });
      }
    }, 12_000);

    const readStatus = () => {
      const providerStatus = element.getAttribute("data-ad-status");
      if (providerStatus === "filled" && !filledReportedRef.current) {
        filledReportedRef.current = true;
        window.clearTimeout(timeout);
        setStatus("filled");
        recordAdvertisingImpression({
          placementKey: config.placementKey,
          provider: "adsense",
        });
        reportAdvertisingEvent({
          event: "ad_slot_filled",
          placementKey: config.placementKey,
          provider: "adsense",
        });
      } else if (providerStatus === "unfilled") {
        window.clearTimeout(timeout);
        setStatus("hidden");
        reportAdvertisingEvent({
          event: "ad_slot_no_fill",
          placementKey: config.placementKey,
          provider: "adsense",
        });
      }
    };

    const observer = new MutationObserver(readStatus);
    observer.observe(element, {
      attributeFilter: ["data-ad-status"],
      attributes: true,
    });
    readStatus();
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [config, status]);

  useEffect(() => {
    const element = adRef.current;
    if (!config || !element || status !== "filled") return;
    let timer: number | null = null;
    let reported = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
        );
        if (!visible && timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if (!visible || reported || timer !== null) return;
        timer = window.setTimeout(() => {
          reported = true;
          reportAdvertisingEvent({
            event: "ad_slot_viewable",
            placementKey: config.placementKey,
            provider: "adsense",
          });
        }, 1_000);
      },
      { threshold: [0.5] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [config, status]);

  if (!config || status === "checking" || status === "hidden") return null;

  return (
    <section aria-label="광고" className={styles.slot}>
      <header className={styles.slotHeader}>
        <span className={styles.slotLabel}>광고</span>
      </header>
      <div className={styles.adSurface} data-status={status}>
        <Script
          crossOrigin="anonymous"
          id="nuang-adsense-script"
          nonce={config.nonce}
          onError={() => {
            setStatus("hidden");
            reportAdvertisingEvent({
              event: "ad_slot_error",
              placementKey: config.placementKey,
              provider: "adsense",
            });
          }}
          onReady={() => setScriptReady(true)}
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.publisherId)}`}
          strategy="afterInteractive"
        />
        <ins
          className="adsbygoogle"
          data-ad-client={config.publisherId}
          data-ad-format="auto"
          data-ad-slot={config.slotId}
          data-full-width-responsive="true"
          ref={adRef}
          style={{ display: "block", width: "100%" }}
        />
      </div>
      <footer className={styles.slotFooter}>
        <span />
        <AdFeedbackMenu
          onHide={() => setStatus("hidden")}
          placementKey={config.placementKey}
          provider="adsense"
        />
      </footer>
    </section>
  );
}

function isApprovedRuntime(canonicalOrigin: string) {
  if (process.env.NODE_ENV !== "production") return false;
  if (typeof window === "undefined" || navigator.webdriver) return false;
  try {
    return window.location.origin === new URL(canonicalOrigin).origin;
  } catch {
    return false;
  }
}
