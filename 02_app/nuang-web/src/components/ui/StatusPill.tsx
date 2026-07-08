import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type StatusPillProps = {
  children: ReactNode;
  tone?: "primary" | "success" | "caution" | "neutral";
};

const toneClass = {
  primary: "bg-surface-soft text-primary",
  success: "bg-[#e8f7ef] text-success",
  caution: "bg-[#fff4dc] text-[#9a6400]",
  neutral: "bg-[#eff0f6] text-muted",
};

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}
