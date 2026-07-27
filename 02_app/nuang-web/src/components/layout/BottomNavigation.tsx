"use client";

import {
  ClipboardCheck,
  House,
  Map,
  MessagesSquare,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const bottomNavigationItems = [
  { href: "/home", label: "홈", icon: House },
  { href: "/assessments", label: "검사", icon: ClipboardCheck },
  { href: "/feed", label: "커뮤니티", icon: MessagesSquare },
  { href: "/map", label: "성향지도", icon: Map },
  { href: "/my", label: "마이", icon: UserRound },
];

export function BottomNavigation() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="하단 주요 메뉴"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
    >
      <div
        className="pointer-events-auto mx-auto grid h-[var(--nu-bottom-nav-total-height)] w-full max-w-[var(--nu-content-width)] grid-cols-5 items-center border-t border-[var(--nu-color-border)] bg-[var(--nu-color-surface)] px-2 pb-[var(--nu-bottom-nav-safe-area-bottom)] shadow-nav"
        data-bottom-navigation-bar
      >
        {bottomNavigationItems.map((item) => {
          const Icon = item.icon;
          const isCommunity = item.href === "/feed";
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-label={`${item.label} 탭`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-[var(--nu-bottom-nav-content-height)] min-w-[var(--nu-touch-min)] flex-col items-center justify-center gap-[var(--nu-bottom-nav-item-gap)] px-0.5 text-caption font-medium leading-none tracking-[-0.01em] text-[var(--nu-neutral-400)] transition-colors focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--nu-color-brand-action)]",
                !isCommunity &&
                  (isActive
                    ? "font-semibold text-[var(--nu-color-brand-action)]"
                    : "hover:text-[var(--nu-neutral-700)]"),
                isCommunity &&
                  "z-[2] -translate-y-[10px] gap-[var(--nu-bottom-nav-primary-label-gap)] font-semibold",
                isCommunity &&
                  (isActive
                    ? "text-[var(--nu-bottom-nav-primary-active-fg)]"
                    : "text-[var(--nu-neutral-400)] hover:text-[var(--nu-neutral-700)]"),
              )}
              data-primary-navigation={isCommunity ? "true" : undefined}
              href={item.href}
              key={item.href}
            >
              <span
                className={cn(
                  "grid h-[var(--nu-bottom-nav-icon-size)] w-[var(--nu-bottom-nav-icon-size)] shrink-0 place-items-center rounded-full transition-colors",
                  !isCommunity && isActive && "bg-[var(--nu-info-50)]",
                  isCommunity &&
                    "h-[var(--nu-bottom-nav-primary-size)] w-[var(--nu-bottom-nav-primary-size)] border-4 border-[var(--nu-color-surface)]",
                  isCommunity &&
                    (isActive
                      ? "bg-[var(--nu-bottom-nav-primary-active-bg)] text-[var(--nu-bottom-nav-primary-active-fg)] shadow-brand-button"
                      : "bg-[var(--nu-bottom-nav-primary-idle-bg)] text-[var(--nu-bottom-nav-primary-idle-fg)] shadow-nav"),
                )}
              >
                <Icon
                  aria-hidden="true"
                  size={isCommunity ? 23 : 20}
                  strokeWidth={isCommunity ? 1.9 : 1.8}
                />
              </span>
              <span className="w-full shrink-0 truncate text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
