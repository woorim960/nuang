"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

/**
 * Keeps client-side Link navigation while deferring route prefetching until the
 * user signals navigation intent. This prevents link-heavy screens from
 * rendering many dynamic routes in the background as soon as they appear.
 */
export function IntentPrefetchLink({
  onFocus,
  onMouseEnter,
  onTouchStart,
  ...props
}: IntentPrefetchLinkProps) {
  const [prefetchEnabled, setPrefetchEnabled] = useState(false);

  return (
    <Link
      {...props}
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented) setPrefetchEnabled(true);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (!event.defaultPrevented) setPrefetchEnabled(true);
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        if (!event.defaultPrevented) setPrefetchEnabled(true);
      }}
      prefetch={prefetchEnabled ? null : false}
    />
  );
}
