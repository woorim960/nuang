import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto min-h-dvh w-full max-w-[var(--nu-content-width)] overflow-x-clip px-[var(--nu-page-gutter)] pb-[var(--nu-page-bottom-with-nav)] pt-[calc(20px+env(safe-area-inset-top))] sm:px-5">
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
}
