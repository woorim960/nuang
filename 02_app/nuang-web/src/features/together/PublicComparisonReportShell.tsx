import { Link2Off } from "lucide-react";
import { NuangRouteLoadingScreen } from "@/components/navigation/NuangRouteLoadingScreen";
import { ButtonLink } from "@/components/ui/Button";

export function PublicComparisonReportShell({
  comparisonReportId,
}: {
  comparisonReportId: string | null;
}) {
  if (comparisonReportId) {
    return <NuangRouteLoadingScreen />;
  }

  return (
    <section className="grid gap-5 py-8 text-center">
      <Link2Off aria-hidden="true" className="mx-auto text-muted" size={28} />
      <div>
        <h1 className="text-xl font-extrabold">
          비교 링크를 다시 확인해 주세요
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          이 링크로는 비교 리포트를 찾기 어려워요. 내 리포트에서 다시 열 수
          있어요.
        </p>
      </div>
      <ButtonLink href="/my/reports">내 리포트 보기</ButtonLink>
    </section>
  );
}
