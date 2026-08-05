import type { CoreResultReportModel } from "@/features/result/unified-core-report/core-result-report-model";
import { adaptValidatedLocalCoreResult } from "@/features/result/unified-core-report/core-result-report-adapter";
import { coreResultCopyVersion } from "@/features/result/report-copy";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import {
  createResponseSnapshotHash,
  prepareAssessmentCompletion,
} from "@/features/assessment/assessment-completion";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  calculateLabResult,
  type LabAnswer,
  type LabAssessment,
} from "@/features/lab/lab-assessments";
import type { StoredLabResult } from "@/features/lab/lab-storage";
import type {
  BalancePairResultView,
  BalanceQuestionResultView,
  BalanceRoomParticipantView,
  BalanceRoomState,
} from "@/features/together-balance/api-contract";
import {
  getBalanceResultLabel,
  getBalanceScoreBand,
  scoreBalanceGroup,
  scoreBalancePair,
} from "@/features/together-balance/scoring";
import { type BalancePack } from "@/features/together-balance/types";

const PREVIEW_DATE = "2026-08-04T00:00:00.000Z";

/**
 * The studio must show a real report, not a sketch of one. This fixture goes
 * through the same scoring and report adapter as a completed customer result,
 * while keeping all identifiers deterministic and local to the preview.
 */
export function buildCorePreviewModel(
  kind: "quick" | "full",
): CoreResultReportModel {
  const assessment =
    kind === "full"
      ? candidateFullCoreAssessment
      : candidateQuickCoreAssessment;
  const responses = Object.fromEntries(
    assessment.items.map((item) => [
      item.itemId,
      {
        answeredAt: PREVIEW_DATE,
        itemId: item.itemId,
        // A deliberate high/low split gives a stable, complete five-letter code
        // without triggering the real flow's tie-follow-up screen.
        value: item.isReverse ? 1 : 5,
      },
    ]),
  ) as LocalAssessmentAttempt["responses"];
  const attempt: LocalAssessmentAttempt = {
    assessmentSnapshot: assessment,
    assessmentId: assessment.assessmentId,
    createdAt: PREVIEW_DATE,
    currentIndex: assessment.items.length - 1,
    expiresAt: "2026-08-11T00:00:00.000Z",
    id: `studio-preview-${kind}`,
    itemIds: assessment.items.map((item) => item.itemId),
    localPersistStatus: "saved",
    mode: assessment.mode,
    releaseId: assessment.releaseId,
    responses,
    state: "in_progress",
    updatedAt: PREVIEW_DATE,
  };
  const readiness = prepareAssessmentCompletion(assessment, attempt);
  const responseSnapshotHash = createResponseSnapshotHash(assessment, attempt);
  const completed: LocalAssessmentAttempt = {
    ...attempt,
    completedAt: PREVIEW_DATE,
    completionStatus: "completed",
    responseSnapshotHash,
    resultCopyVersion: coreResultCopyVersion,
    resultEvidenceStatus: readiness.evidenceStatus,
    resultSnapshot: {
      ...readiness.versionBundle,
      createdAt: PREVIEW_DATE,
      responseSnapshotHash,
      resultCopyVersion: coreResultCopyVersion,
      resultStatus: "ready",
      scoreResult: readiness.result,
    },
    state: "completed",
  };
  const model = adaptValidatedLocalCoreResult(completed);
  if (!model) {
    throw new Error(`코어 결과 미리보기 데이터를 만들 수 없습니다: ${kind}`);
  }
  return model;
}

export function buildLabPreviewResult(
  assessment: LabAssessment,
): StoredLabResult {
  const answers: Record<string, LabAnswer> = {};
  assessment.questions.forEach((question, index) => {
    if (question.options.length === 0) return;
    const option = question.options[index % question.options.length];
    answers[question.id] = {
      optionId: option.id,
      questionId: question.id,
      resultId: option.resultId,
    };
  });
  return {
    assessmentSnapshot: assessment,
    answers,
    completedAt: PREVIEW_DATE,
    contentVersion: assessment.contentVersion,
    localResultId: `studio-preview-lab-${assessment.slug}`,
    result: calculateLabResult(assessment, answers),
    slug: assessment.slug,
    sync: { status: "synced", syncedAt: PREVIEW_DATE },
  };
}

export function buildBalancePreviewRoom(pack: BalancePack): BalanceRoomState {
  const questions = pack.questions.slice(0, pack.defaultQuestionCount);
  const participantIds = ["studio-alice", "studio-bora", "studio-chris"];
  const responses = participantIds.map((participantId, participantIndex) => ({
    id: participantId,
    responses: questions.map((question, questionIndex) => ({
      answeredAt: PREVIEW_DATE,
      itemId: question.id,
      optionId: question.options[(questionIndex + participantIndex) % 2].id,
      participantId,
    })),
  }));
  const group =
    pack.scoringTemplate === "discovery_only" ||
    pack.scoringTemplate === "reciprocal_fit"
      ? null
      : scoreBalanceGroup(pack, responses);
  const pairResults: BalancePairResultView[] = [];
  for (let right = 1; right < responses.length; right += 1) {
    const leftParticipant = responses[0];
    const rightParticipant = responses[right];
    const matchCount = questions.filter((question) => {
      const leftOption = leftParticipant.responses.find(
        (response) => response.itemId === question.id,
      )?.optionId;
      const rightOption = rightParticipant.responses.find(
        (response) => response.itemId === question.id,
      )?.optionId;
      return leftOption === rightOption;
    }).length;
    const score =
      pack.scoringTemplate === "reciprocal_fit"
        ? {
            comparedCount: questions.length,
            matchCount,
            roundedScore:
              questions.length === 0
                ? 0
                : Math.round((matchCount / questions.length) * 100),
          }
        : scoreBalancePair(
            pack,
            leftParticipant.id,
            leftParticipant.responses,
            rightParticipant.id,
            rightParticipant.responses,
          );
    pairResults.push({
      answers: questions.map((question) => {
        const myOption = question.options.find(
          (option) =>
            option.id ===
            leftParticipant.responses.find(
              (response) => response.itemId === question.id,
            )?.optionId,
        )!;
        const otherOption = question.options.find(
          (option) =>
            option.id ===
            rightParticipant.responses.find(
              (response) => response.itemId === question.id,
            )?.optionId,
        )!;
        return {
          id: question.id,
          isMatch: myOption.id === otherOption.id,
          myOptionText: myOption.text,
          otherOptionText: otherOption.text,
          prompt: question.prompt,
          subtopic: question.subtopic,
        };
      }),
      comparedCount: score.comparedCount,
      matchCount: score.matchCount,
      otherParticipantId: rightParticipant.id,
      otherParticipantNickname: participantName(rightParticipant.id),
      score: score.roundedScore ?? 0,
    });
  }

  const questionResults = questions.map<BalanceQuestionResultView>(
    (question) => {
      const counts = question.options.map((option) => ({
        count: responses.filter((participant) =>
          participant.responses.some(
            (response) =>
              response.itemId === question.id &&
              response.optionId === option.id,
          ),
        ).length,
        optionId: option.id,
        optionText: option.text,
      }));
      return {
        counts,
        id: question.id,
        isUnanimous: counts.some((item) => item.count === responses.length),
        prompt: question.prompt,
        subtopic: question.subtopic,
      };
    },
  );
  const groupScore = group?.roundedScore ?? 68;
  const groupLabel = getBalanceScoreBand(groupScore).title;
  const participants: BalanceRoomParticipantView[] = participantIds.map(
    (id, index) => ({
      answeredCount: questions.length,
      completedAt: PREVIEW_DATE,
      id,
      isMe: index === 0,
      isOwner: index === 0,
      nickname: participantName(id),
      status: "completed",
    }),
  );
  return {
    canFinalize: false,
    canShareToFeed: false,
    currentParticipantCount: participants.length,
    expiresAt: "2026-08-11T00:00:00.000Z",
    isOwner: true,
    myParticipantId: participantIds[0],
    pack: {
      description: pack.description,
      resultLabel: getBalanceResultLabel(pack.resultSemantics),
      scoringTemplate: pack.scoringTemplate,
      slug: pack.slug,
      title: pack.title,
    },
    participants,
    participationMode: "private_group",
    questions: questions.map((question, index) => ({
      id: question.id,
      options: [
        {
          id: question.options[0].id,
          position: "left",
          text: question.options[0].text,
        },
        {
          id: question.options[1].id,
          position: "right",
          text: question.options[1].text,
        },
      ],
      prompt: question.prompt,
      responseOptionId: responses[0].responses[index].optionId,
      roundNumber: Math.floor(index / 8) + 1,
      subtopic: question.subtopic,
    })),
    questionCount: questions.length,
    result: {
      comparedQuestionCount: questions.length,
      completedParticipantCount: participants.length,
      groupLabel,
      groupScore,
      isFinal: true,
      pairCount: (participants.length * (participants.length - 1)) / 2,
      pairResults,
      splitQuestions: questionResults.filter(
        (question) => !question.isUnanimous,
      ),
      unanimousQuestions: questionResults.filter(
        (question) => question.isUnanimous,
      ),
    },
    resultStatus: "final",
    roomCode: "PREVIEW",
    roomId: "studio-preview-balance",
    roomName: "함께하기 결과 미리보기",
    targetParticipantCount: participants.length,
  };
}

export function buildBalanceQuestionPreviewRoom(
  pack: BalancePack,
): BalanceRoomState {
  const resultRoom = buildBalancePreviewRoom(pack);
  return {
    ...resultRoom,
    currentParticipantCount: 1,
    participants: resultRoom.participants.map((participant, index) => ({
      ...participant,
      answeredCount: 0,
      completedAt: null,
      status: index === 0 ? "active" : "reserved",
    })),
    questions: resultRoom.questions.map((question) => ({
      ...question,
      responseOptionId: null,
    })),
    result: null,
    resultStatus: "waiting",
  };
}

function participantName(id: string) {
  if (id.endsWith("alice")) return "하늘";
  if (id.endsWith("bora")) return "보라";
  return "민트";
}
