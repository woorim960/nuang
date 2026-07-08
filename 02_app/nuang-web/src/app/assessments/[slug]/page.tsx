import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { AssessmentRunner } from "@/features/assessment/AssessmentRunner";
import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import { quickCoreAssessment } from "@/features/assessment/quick-core-seed";

type AssessmentStartPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AssessmentStartPage({
  params,
}: AssessmentStartPageProps) {
  const { slug } = await params;
  const isQuick = slug.includes("quick");

  if (slug === "nu-core-quick") {
    return <AssessmentRunner assessment={quickCoreAssessment} />;
  }

  if (slug === "nu-core-full") {
    return <AssessmentRunner assessment={fullCoreAssessment} />;
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-muted"
        href="/assessments"
      >
        <ArrowLeft size={18} />
        검사
      </Link>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <StatusPill tone="primary">{isQuick ? "예비 결과" : "정밀 결과"}</StatusPill>
        <h1 className="mt-4 text-2xl font-black">
          {isQuick ? "빠른 코어" : "정밀 코어"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {isQuick
            ? "20문항으로 지금 가장 가까운 예비 성향을 확인해요."
            : "60문항으로 5영역과 10세부 성향을 차분히 살펴봐요."}
        </p>
        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-muted">
          <Clock size={17} />
          {isQuick ? "약 3분" : "약 10분"}
        </div>
        <Button className="mt-6 w-full">시작하기</Button>
      </section>
    </main>
  );
}
