import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { AssessmentRunner } from "@/features/assessment/AssessmentRunner";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { PrecisionAssessmentIntro } from "@/features/assessment/PrecisionAssessmentIntro";
import {
  parsePrecisionEntrySource,
  sanitizePrecisionDestination,
} from "@/features/assessment/precision-entry";
import { M05ParticipantRunner } from "@/features/research/m05/M05ParticipantRunner";

type AssessmentStartPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssessmentStartPage({
  params,
  searchParams,
}: AssessmentStartPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const isQuick = slug.includes("quick");

  if (
    slug === "nu-core-full" &&
    process.env.NODE_ENV === "development" &&
    readQuery(query.preview) === "beta-v1"
  ) {
    return (
      <AssessmentRunner
        assessment={betaCoreAssessment}
        returnDestination="/home"
      />
    );
  }

  if (
    slug === "nu-core-full" &&
    process.env.NODE_ENV === "development" &&
    readQuery(query.preview) === "m05-cognitive"
  ) {
    return <M05ParticipantRunner />;
  }

  if (slug === "nu-core-quick") {
    return (
      <AssessmentRunner
        assessment={candidateQuickCoreAssessment}
        returnDestination={sanitizePrecisionDestination(
          readQuery(query.returnTo),
        )}
      />
    );
  }

  if (slug === "nu-core-full") {
    const entrySource = parsePrecisionEntrySource(readQuery(query.from));
    const defaultBack =
      entrySource === "home"
        ? "/home"
        : entrySource === "code-map-gate"
          ? "/map"
          : entrySource === "compare-gate"
            ? "/together"
            : "/assessments";

    return (
      <PrecisionAssessmentIntro
        assessment={candidateFullCoreAssessment}
        backDestination={
          sanitizePrecisionDestination(readQuery(query.backTo)) ?? defaultBack
        }
        entrySource={entrySource}
        forceIntro={
          process.env.NODE_ENV === "development" &&
          readQuery(query.preview) === "intro"
        }
        requireQuickPrerequisite
        returnDestination={sanitizePrecisionDestination(
          readQuery(query.returnTo),
        )}
      />
    );
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
        <StatusPill tone="primary">
          {isQuick ? "예비 결과" : "정밀 결과"}
        </StatusPill>
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

function readQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
