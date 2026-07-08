import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import type { PolicySkeleton } from "@/features/policy/policy-skeleton";
import { policySkeletonDisplayVersion } from "@/features/policy/policy-skeleton";

export function PolicySkeletonView({ policy }: { policy: PolicySkeleton }) {
  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-muted"
        href="/my"
      >
        <ArrowLeft aria-hidden="true" size={18} />
        마이
      </Link>

      <header className="mt-5 rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="caution">NO-GO</StatusPill>
              <StatusPill tone="neutral">{policySkeletonDisplayVersion}</StatusPill>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-8">{policy.title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">{policy.summary}</p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
            <ShieldCheck aria-hidden="true" size={22} />
          </div>
        </div>
      </header>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">검토 상태</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {policy.reviewStatus}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          이 화면은 최종 법률 문서가 아닙니다. 공개 출시 전 검토와 승인이
          필요합니다.
        </p>
      </section>

      <div className="mt-5 grid gap-3">
        {policy.sections.map((section) => (
          <section
            className="rounded-lg border border-line bg-white p-4"
            key={section.title}
          >
            <h2 className="text-base font-bold">{section.title}</h2>
            <ul className="mt-3 grid gap-2">
              {section.items.map((item) => (
                <li
                  className="rounded-lg bg-surface-soft px-3 py-2 text-sm font-semibold leading-6"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
