"use client";

import { Home, Map, MessageCircle, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const bottomNavigationItems = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/feed", label: "피드", icon: MessageCircle },
  { href: "/assessments", label: "검사", icon: Search },
  { href: "/map", label: "성향지도", icon: Map },
  { href: "/my", label: "마이", icon: UserRound },
];

export function BottomNavigation() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="하단 주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ececec] bg-white/95 px-2 pb-[calc(7px+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl"
    >
      <div className="mx-auto grid min-h-[58px] max-w-[520px] grid-cols-5 gap-1">
        {bottomNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-label={`${item.label} 탭`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold leading-none text-[#7a7a7a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]",
                isActive ? "text-[#111111]" : "hover:text-[#111111]",
              )}
              href={item.href}
              key={item.href}
            >
              <span className="grid h-7 w-7 place-items-center">
                <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-1 w-1 rounded-full bg-[#111111]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
