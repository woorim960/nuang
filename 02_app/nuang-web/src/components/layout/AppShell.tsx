import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto min-h-dvh w-full max-w-[520px] px-5 pb-[calc(82px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] sm:px-6">
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
}
