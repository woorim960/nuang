import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssessmentRunner } from "@/features/assessment/AssessmentRunner";
import { FriendTraitMatch } from "@/features/assessment/FriendTraitMatch";
import {
  defaultFriendTraitMatchContent,
  type FriendTraitMatchContent,
} from "@/features/assessment/friend-trait-match-content";
import { parseFriendTraitMatchInvite } from "@/features/assessment/friend-trait-match-invite";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { applyCorePlainKoreanRuntimeCopy } from "@/features/assessment/core-runtime-plain-language";
import { PrecisionAssessmentIntro } from "@/features/assessment/PrecisionAssessmentIntro";
import {
  parsePrecisionEntrySource,
  sanitizePrecisionDestination,
} from "@/features/assessment/precision-entry";
import { M05ParticipantRunner } from "@/features/research/m05/M05ParticipantRunner";
import type { AssessmentDefinition } from "@/features/assessment/types";
import {
  resolveAssessmentReleaseById,
  resolveAssessmentRuntimeContent,
} from "@/features/assessment/server-assessment-content-runtime";
import {
  createPrivatePageMetadata,
  createPublicPageMetadata,
} from "@/features/seo/site-config";

type AssessmentStartPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: Pick<AssessmentStartPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;

  if (slug === "nu-core-quick") {
    return createPublicPageMetadata({
      description:
        "22개 생활 질문으로 지금의 나를 다섯 가지 성향 기준에서 알아보는 무료 성향 테스트예요. 약 3분이면 시작할 수 있어요.",
      image: "/images/share/nuang-result-share-core-v2.png",
      imageAlt: "뉴앙 무료 성향 테스트 코어 리포트",
      path: "/assessments/nu-core-quick",
      title: "무료 성향 테스트",
    });
  }

  if (slug === "nu-core-full") {
    return createPublicPageMetadata({
      description:
        "생활 속 선택을 더 자세히 돌아보며 다섯 가지 성향 기준을 정밀하게 살펴보는 뉴앙 성향 검사예요.",
      image: "/images/share/nuang-result-share-core-v2.png",
      imageAlt: "뉴앙 정밀 성향 검사 코어 리포트",
      path: "/assessments/nu-core-full",
      title: "정밀 성향 검사",
    });
  }

  return createPrivatePageMetadata({ title: "검사" });
}

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
        assessment={applyCorePlainKoreanRuntimeCopy(betaCoreAssessment)}
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
    const assessment = await resolveCoreAssessment(
      "quick-core",
      "core_quick",
      candidateQuickCoreAssessment,
    );
    if (!assessment) notFound();
    return (
      <AssessmentRunner
        assessment={assessment}
        returnDestination={sanitizePrecisionDestination(
          readQuery(query.returnTo),
        )}
      />
    );
  }

  if (slug === "nu-core-full") {
    const assessment = await resolveCoreAssessment(
      "full-core",
      "core_precision",
      candidateFullCoreAssessment,
    );
    if (!assessment) notFound();
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
        assessment={assessment}
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

  const friendInvite = parseFriendTraitMatchInvite(query);
  const friendResolution =
    friendInvite.status === "ready" && friendInvite.releaseId
      ? await resolveAssessmentReleaseById({
          category: "together",
          releaseId: friendInvite.releaseId,
          slug,
          subtype: "friend_match",
        })
      : await resolveAssessmentRuntimeContent({
          category: "together",
          slug,
          subtype: "friend_match",
        });
  if (friendResolution.state === "published") {
    const content =
      (
        friendResolution.document.payload as {
          config?: FriendTraitMatchContent;
        }
      ).config ?? defaultFriendTraitMatchContent;
    return (
      <FriendTraitMatch
        content={content}
        inviteState={friendInvite}
        releaseId={friendResolution.releaseId}
        slug={slug}
      />
    );
  }

  notFound();
}

async function resolveCoreAssessment(
  contentSlug: string,
  subtype: "core_quick" | "core_precision",
  fallback: AssessmentDefinition,
) {
  const resolution = await resolveAssessmentRuntimeContent({
    category: "core",
    slug: contentSlug,
    subtype,
  });
  if (resolution.state === "unavailable") return null;
  const definition = (
    resolution.document?.payload as
      { definition?: AssessmentDefinition } | undefined
  )?.definition;
  return {
    ...(definition ?? applyCorePlainKoreanRuntimeCopy(fallback)),
    ...(resolution.releaseId ? { contentReleaseId: resolution.releaseId } : {}),
  };
}

function readQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
