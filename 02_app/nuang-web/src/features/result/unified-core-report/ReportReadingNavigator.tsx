"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./ReportReadingNavigator.module.css";

export type ReportReadingNavigationItem = {
  id: string;
  label: string;
};

export function ReportReadingNavigator({
  items,
}: {
  items: readonly ReportReadingNavigationItem[];
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  const progress = items.length
    ? Math.round(((activeIndex + 1) / items.length) * 100)
    : 0;
  const sectionIds = useMemo(() => items.map((item) => item.id), [items]);

  const moveToSection = (id: string) => {
    setActiveId(id);

    const target = document.getElementById(id);
    if (!target) return;

    target.scrollIntoView({ behavior: "auto", block: "start" });

    const nextUrl = new URL(window.location.href);
    nextUrl.hash = id;
    window.history.replaceState(
      window.history.state,
      "",
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
    );
  };

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const elements = sectionIds.flatMap((id) => {
      const element = document.getElementById(id);
      return element ? [element] : [];
    });
    if (elements.length === 0) return;

    const visible = new Map<string, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry);
          else visible.delete(entry.target.id);
        });
        const next = [...visible.values()].sort(
          (left, right) =>
            Math.abs(left.boundingClientRect.top) -
            Math.abs(right.boundingClientRect.top),
        )[0];
        if (next?.target.id) setActiveId(next.target.id);
      },
      {
        rootMargin: "-118px 0px -62% 0px",
        threshold: [0, 0.08, 0.4],
      },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sectionIds]);

  if (items.length < 3) return null;

  return (
    <nav aria-label="결과 리포트 목차" className={styles.root}>
      <div className={styles.progressRow}>
        <span>리포트 읽기</span>
        <strong>{progress}%</strong>
      </div>
      <div
        aria-label={`리포트 읽기 진행률 ${progress}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className={styles.progressTrack}
        role="progressbar"
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.links}>
        {items.map((item) => (
          <a
            aria-current={activeId === item.id ? "location" : undefined}
            data-active={activeId === item.id}
            data-route-loading="off"
            href={`#${item.id}`}
            key={item.id}
            onClick={(event) => {
              event.preventDefault();
              moveToSection(item.id);
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
