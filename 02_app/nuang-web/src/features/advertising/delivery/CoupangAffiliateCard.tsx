"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CoupangAffiliateCreative } from "./advertising-delivery-contract";
import { reportAdvertisingEvent } from "./advertising-events";
import {
  canRequestAdvertising,
  recordAdvertisingImpression,
} from "./advertising-session";
import { AdFeedbackMenu } from "./AdFeedbackMenu";
import styles from "./AdvertisingDelivery.module.css";

export function CoupangAffiliateCard({
  creative,
}: {
  creative: CoupangAffiliateCreative | null;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!creative || !isSafeDestination(creative.destinationUrl)) return;
      if (
        !canRequestAdvertising({
          creativeId: creative.creativeId,
          dailyCap: creative.dailyCap,
          placementKey: creative.placementKey,
          provider: "coupang",
          sessionCap: creative.sessionCap,
        })
      ) {
        return;
      }
      setVisible(true);
      reportAdvertisingEvent({
        campaignId: creative.campaignId,
        creativeId: creative.creativeId,
        event: "ad_slot_eligible",
        placementKey: creative.placementKey,
        provider: "coupang",
      });
      reportAdvertisingEvent({
        campaignId: creative.campaignId,
        creativeId: creative.creativeId,
        event: "ad_slot_filled",
        placementKey: creative.placementKey,
        provider: "coupang",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [creative]);

  useEffect(() => {
    const element = cardRef.current;
    if (!creative || !visible || !element) return;
    let timer: number | null = null;
    let reported = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
        );
        if (!inView && timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if (!inView || reported || timer !== null) return;
        timer = window.setTimeout(() => {
          reported = true;
          recordAdvertisingImpression({
            creativeId: creative.creativeId,
            placementKey: creative.placementKey,
            provider: "coupang",
          });
          reportAdvertisingEvent({
            campaignId: creative.campaignId,
            creativeId: creative.creativeId,
            event: "ad_slot_viewable",
            placementKey: creative.placementKey,
            provider: "coupang",
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
  }, [creative, visible]);

  if (!creative || !visible) return null;

  return (
    <section aria-label="광고 · 쿠팡 파트너스" className={styles.slot} ref={cardRef}>
      <header className={styles.slotHeader}>
        <span className={styles.slotLabel}>광고 · 쿠팡 파트너스</span>
      </header>
      <div className={styles.affiliateSurface}>
        <p className={styles.affiliateDisclosure}>{creative.disclosure}</p>
        <a
          className={styles.affiliateLink}
          href={creative.destinationUrl}
          onClick={() =>
            reportAdvertisingEvent({
              campaignId: creative.campaignId,
              creativeId: creative.creativeId,
              event: "ad_click_out",
              placementKey: creative.placementKey,
              provider: "coupang",
            })
          }
          rel="sponsored nofollow noopener noreferrer"
          target="_blank"
        >
          {/* Partner creative hosts are operator-reviewed and intentionally bypass image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={creative.altText}
            className={styles.affiliateImage}
            loading="lazy"
            referrerPolicy="no-referrer"
            src={creative.imageUrl}
          />
          <span className={styles.affiliateCopy}>
            <strong>{creative.title}</strong>
            <span>{creative.description}</span>
          </span>
          <ExternalLink
            aria-hidden="true"
            className={styles.externalIcon}
            size={18}
            strokeWidth={1.6}
          />
          <span className="sr-only">새 창에서 쿠팡으로 이동</span>
        </a>
      </div>
      <footer className={styles.slotFooter}>
        <span />
        <AdFeedbackMenu
          campaignId={creative.campaignId}
          creativeId={creative.creativeId}
          onHide={() => setVisible(false)}
          placementKey={creative.placementKey}
          provider="coupang"
        />
      </footer>
    </section>
  );
}

function isSafeDestination(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
