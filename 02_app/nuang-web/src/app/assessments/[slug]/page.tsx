import { notFound } from "next/navigation";
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
            : "/home";

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

  notFound();
}

function readQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
