"use client";

import { Home, Map, Search, UsersRound, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const bottomNavigationItems = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/assessments", label: "검사", icon: Search },
  { href: "/map", label: "성향지도", icon: Map },
  { href: "/together", label: "함께", icon: UsersRound },
  { href: "/my", label: "마이", icon: UserRound },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="하단 주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_36px_rgb(63_56_118_/_10%)] backdrop-blur-xl"
    >
      <div className="mx-auto grid min-h-[72px] max-w-[520px] grid-cols-5 gap-1">
        {bottomNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-label={`${item.label} 탭`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-bold leading-none text-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isActive ? "text-primary" : "hover:text-foreground",
              )}
              href={item.href}
              key={item.href}
            >
              <span
                className={cn(
                  "grid h-8 w-10 place-items-center rounded-full transition-colors",
                  isActive
                    ? "bg-primary text-white shadow-[0_10px_20px_rgb(101_70_215_/_18%)]"
                    : "text-muted",
                )}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
