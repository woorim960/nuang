"use client";

import type {
  AdvertisingClientEvent,
  AdvertisingPlacementKey,
  AdvertisingProvider,
} from "./advertising-delivery-contract";

export function reportAdvertisingEvent({
  campaignId,
  creativeId,
  event,
  placementKey,
  provider,
}: {
  campaignId?: string;
  creativeId?: string;
  event: AdvertisingClientEvent;
  placementKey: AdvertisingPlacementKey;
  provider: AdvertisingProvider;
}) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    campaignId: campaignId ?? null,
    creativeId: creativeId ?? null,
    event,
    placementKey,
    provider,
    viewportBucket: getAdvertisingViewportBucket(),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/advertising/events",
      new Blob([payload], { type: "application/json" }),
    );
    return;
  }

  void fetch("/api/advertising/events", {
    body: payload,
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => undefined);
}

export function getAdvertisingViewportBucket() {
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}
