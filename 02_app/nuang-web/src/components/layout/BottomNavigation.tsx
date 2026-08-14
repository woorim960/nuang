"use client";

import { House, Map, MessagesSquare, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import { cn } from "@/lib/utils/cn";

export const bottomNavigationItems = [
  { href: "/home", label: "홈", icon: House },
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
        className="pointer-events-auto mx-auto grid h-[var(--nu-bottom-nav-total-height)] w-full max-w-[var(--nu-content-width)] grid-cols-4 items-center border-t border-[var(--nu-color-border)] bg-[var(--nu-color-surface)] px-[var(--nu-bottom-nav-horizontal-padding)] pb-[var(--nu-bottom-nav-safe-area-bottom)] shadow-nav"
        data-bottom-navigation-bar
      >
        {bottomNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/home"
              ? pathname === "/home"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <IntentPrefetchLink
              aria-label={`${item.label} 탭`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-[var(--nu-bottom-nav-content-height)] min-h-[var(--nu-touch-min)] min-w-[var(--nu-touch-min)] flex-col items-center justify-center gap-[var(--nu-bottom-nav-item-gap)] px-0.5 py-1 text-caption font-medium leading-none tracking-[-0.01em] text-[var(--nu-neutral-400)] transition-colors focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--nu-color-focus)]",
                isActive
                  ? "font-semibold text-[var(--nu-color-brand-action)]"
                  : "hover:text-[var(--nu-neutral-700)]",
              )}
              href={item.href}
              key={item.href}
            >
              <span
                className={cn(
                  "grid h-[var(--nu-bottom-nav-icon-size)] w-[var(--nu-bottom-nav-icon-size)] shrink-0 place-items-center rounded-full transition-colors",
                  isActive && "bg-[var(--nu-color-brand-surface)]",
                )}
                data-bottom-navigation-icon
              >
                <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
              </span>
              <span
                className="line-clamp-2 max-w-full shrink-0 break-words text-center leading-[1.15] whitespace-normal"
                data-bottom-navigation-label
              >
                {item.label}
              </span>
            </IntentPrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
