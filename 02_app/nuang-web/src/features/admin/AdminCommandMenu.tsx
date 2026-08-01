"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { adminNavigationEntries } from "./admin-navigation";
import styles from "./AdminCommandMenu.module.css";

export function AdminCommandMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    if (!normalized) return adminNavigationEntries;

    return adminNavigationEntries.filter((item) =>
      [item.label, item.groupLabel, ...item.keywords]
        .join(" ")
        .toLocaleLowerCase("ko-KR")
        .includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (!window.matchMedia("(min-width: 900px)").matches) return;
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Search aria-hidden="true" size={15} strokeWidth={1.8} />
        <span>빠른 이동</span>
        <kbd>⌘K</kbd>
      </button>

      {open ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setOpen(false);
              setQuery("");
            }
          }}
        >
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.dialog}
            onKeyDown={trapDialogFocus}
            ref={dialogRef}
            role="dialog"
          >
            <header>
              <div>
                <span>ADMIN NAVIGATION</span>
                <h2 id={titleId}>메뉴 및 업무 이동</h2>
              </div>
              <button
                aria-label="빠른 이동 닫기"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
            </header>

            <label className={styles.searchField}>
              <Search aria-hidden="true" size={18} strokeWidth={1.8} />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="메뉴, 신고, 문항, 시스템 검색"
                ref={inputRef}
                value={query}
              />
              <kbd>ESC</kbd>
            </label>

            <div aria-live="polite" className={styles.results}>
              {results.length > 0 ? (
                results.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === "/admin"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      data-active={active}
                      href={item.href}
                      key={item.href}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className={styles.resultIcon}>
                        <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
                      </span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.groupLabel}</small>
                      </span>
                      {active ? <em>현재</em> : null}
                      <ArrowRight
                        aria-hidden="true"
                        size={16}
                        strokeWidth={1.7}
                      />
                    </Link>
                  );
                })
              ) : (
                <div className={styles.empty}>
                  <strong>일치하는 운영 메뉴가 없습니다</strong>
                  <p>다른 업무 이름이나 메뉴 이름으로 찾아보세요.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function trapDialogFocus(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;

  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
