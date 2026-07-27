import { ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export function PublicComparisonReportPreview() {
  return (
    <section className="grid min-h-[56dvh] place-content-center gap-5 text-center">
      <ShieldCheck
        aria-hidden="true"
        className="mx-auto text-primary"
        size={28}
      />
      <div>
        <h1 className="text-2xl font-black">비교 리포트를 만들 수 없어요</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          두 사람의 공개 범위를 확인한 후 다시 시도해 주세요.
        </p>
      </div>

      <ButtonLink className="w-full" href="/my/reports" variant="secondary">
        내 리포트로
      </ButtonLink>
    </section>
  );
}
