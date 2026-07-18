import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type StatusPillProps = {
  children: ReactNode;
  tone?: "primary" | "success" | "caution" | "neutral";
};

const toneClass = {
  primary: "text-primary",
  success: "text-success",
  caution: "text-[#9a6400]",
  neutral: "text-muted",
};

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-bold leading-none",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}
