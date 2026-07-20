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
      <div className="pointer-events-auto mx-auto grid min-h-[58px] w-full max-w-[430px] grid-cols-5 items-end border-t border-[#ebebef] bg-white/[0.98] px-2 pb-[calc(6px+env(safe-area-inset-bottom))] pt-[6px] shadow-[0_-8px_24px_rgba(32,35,42,0.035)] backdrop-blur-xl">
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
                "relative grid h-[46px] min-h-[46px] min-w-0 justify-items-center gap-[5px] px-0.5 text-[10.5px] font-medium leading-none tracking-[-0.01em] text-[#9297a3] transition-colors focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6657d9]",
                !isCommunity &&
                  (isActive
                    ? "content-center font-semibold text-[#6657d9]"
                    : "content-center hover:text-[#555964]"),
                isCommunity && "z-[2] content-end font-semibold text-[#7065c9]",
              )}
              data-primary-navigation={isCommunity ? "true" : undefined}
              href={item.href}
              key={item.href}
            >
              <span
                className={cn(
                  "grid h-[30px] w-[30px] place-items-center rounded-full transition-colors",
                  !isCommunity && isActive && "bg-[#f1effc]",
                  isCommunity &&
                    "absolute bottom-[15px] left-1/2 h-12 w-12 -translate-x-1/2 border-4 border-white bg-[#efedff] text-[#6657d9] shadow-[0_8px_22px_rgba(102,87,217,0.10),inset_0_0_0_1px_#dcd7fb]",
                )}
              >
                <Icon
                  aria-hidden="true"
                  size={isCommunity ? 23 : 20}
                  strokeWidth={isCommunity ? 1.9 : 1.8}
                />
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
