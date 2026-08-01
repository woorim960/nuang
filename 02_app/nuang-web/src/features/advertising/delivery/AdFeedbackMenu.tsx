"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useId, useState } from "react";
import type {
  AdvertisingFeedbackReason,
  AdvertisingPlacementKey,
  AdvertisingProvider,
} from "./advertising-delivery-contract";
import {
  getAdvertisingViewportBucket,
  reportAdvertisingEvent,
} from "./advertising-events";
import { suppressAdvertisingProvider } from "./advertising-session";
import styles from "./AdvertisingDelivery.module.css";

const options: Array<{
  label: string;
  reason: AdvertisingFeedbackReason;
}> = [
  { label: "관심 없어요", reason: "not_interested" },
  { label: "너무 자주 보여요", reason: "too_repetitive" },
  { label: "불편한 내용이에요", reason: "uncomfortable" },
  { label: "잘못된 광고 같아요", reason: "seems_wrong" },
];

export function AdFeedbackMenu({
  campaignId,
  creativeId,
  onHide,
  placementKey,
  provider,
}: {
  campaignId?: string;
  creativeId?: string;
  onHide: () => void;
  placementKey: AdvertisingPlacementKey;
  provider: AdvertisingProvider;
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(reason: AdvertisingFeedbackReason) {
    suppressAdvertisingProvider(provider);
    setSubmitted(true);
    setOpen(false);
    onHide();
    reportAdvertisingEvent({
      campaignId,
      creativeId,
      event: "ad_suppressed",
      placementKey,
      provider,
    });

    try {
      await fetch("/api/advertising/feedback", {
        body: JSON.stringify({
          campaignId: campaignId ?? null,
          creativeId: creativeId ?? null,
          placementKey,
          provider,
          reason,
          viewportBucket: getAdvertisingViewportBucket(),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    } catch {
      // Hiding is local-first. A feedback outage must not restore the ad.
    }
  }

  if (submitted) {
    return (
      <p aria-live="polite" className={styles.feedbackThanks}>
        <Check aria-hidden="true" size={14} strokeWidth={2} />
        의견을 반영했어요
      </p>
    );
  }

  return (
    <div className={styles.feedbackMenu}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        className={styles.feedbackTrigger}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        광고 의견
        {open ? (
          <X aria-hidden="true" size={15} strokeWidth={1.8} />
        ) : (
          <ChevronDown aria-hidden="true" size={15} strokeWidth={1.8} />
        )}
      </button>
      {open ? (
        <div className={styles.feedbackOptions} id={menuId}>
          <p>이 광고를 숨기는 이유를 알려주세요.</p>
          <div>
            {options.map((option) => (
              <button
                key={option.reason}
                onClick={() => void submit(option.reason)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
