import { z } from "zod";

import {
  coreDomainDefinitions,
  coreFacetDefinitions,
} from "@/features/assessment/quick-core-seed";
import {
  isRepresentativeTraitTarget,
  resolveFreeTopicTraitRule,
} from "@/features/assessment/free-topic-assessments";
import type { BalancePack } from "@/features/together-balance/types";
import { validateBalancePack } from "@/features/together-balance/validation";

import {
  assessmentStudioDocumentSchema,
  type AssessmentStudioDocument,
  type AssessmentStudioSubtype,
  type AssessmentStudioValidationIssue,
} from "./assessment-studio-contract";

const subtypeCategory: Record<
  AssessmentStudioSubtype,
  AssessmentStudioDocument["category"]
> = {
  balance_pack: "together",
  core_precision: "core",
  core_quick: "core",
  free_topic: "topic",
  friend_match: "together",
  odd_lab: "lab",
};

const coreItemSchema = z
  .object({
    contextLabel: z.string().trim().min(1).optional(),
    domainId: z.string().min(1),
    facetId: z.string().min(1),
    isReverse: z.boolean(),
    itemId: z.string().min(1),
    text: z.string().trim().min(1),
  })
  .passthrough();

const corePayloadSchema = z
  .object({
    definition: z
      .object({
        adaptiveItems: z.array(coreItemSchema).optional(),
        assessmentId: z.string().min(1),
        estimatedMinutes: z.number().int().positive(),
        items: z.array(coreItemSchema).min(1),
        mode: z.enum(["quick", "full"]),
        releaseId: z.string().min(1),
        resultLabel: z.string().min(1),
        title: z.string().min(1),
      })
      .passthrough(),
    engineBinding: z.object({
      key: z.enum(["core_quick_v1", "core_precision_v1"]),
      locked: z.literal(true),
    }),
  })
  .passthrough();

const topicPayloadSchema = z
  .object({
    assessment: z
      .object({
        caption: z.string().min(1),
        categoryId: z.string().min(1),
        estimatedMinutes: z.number().int().positive(),
        mappings: z.array(z.unknown()),
        recallPeriodLabel: z.string().trim().min(1).optional(),
        recallPrompt: z.string().trim().min(1).max(120).optional(),
        reportMode: z
          .enum(["bipolar_dimensions", "independent_dimensions"])
          .optional(),
        reportScales: z
          .array(
            z
              .object({
                highCopy: z.string().trim().min(1),
                highLabel: z.string().trim().min(1),
                highAction: z.string().trim().min(1).optional(),
                highStrength: z.string().trim().min(1).optional(),
                highWatch: z.string().trim().min(1).optional(),
                id: z.string().min(1),
                lowCopy: z.string().trim().min(1),
                lowLabel: z.string().trim().min(1),
                lowAction: z.string().trim().min(1).optional(),
                lowStrength: z.string().trim().min(1).optional(),
                lowWatch: z.string().trim().min(1).optional(),
                midCopy: z.string().trim().min(1),
                midLabel: z.string().trim().min(1),
                midAction: z.string().trim().min(1).optional(),
                midStrength: z.string().trim().min(1).optional(),
                midWatch: z.string().trim().min(1).optional(),
              })
              .passthrough(),
          )
          .optional(),
        responseScale: z
          .enum(["frequency_5", "helpfulness_5", "need_5"])
          .optional(),
        slug: z.string().min(1),
        title: z.string().min(1),
      })
      .passthrough(),
    questions: z.array(
      z
        .object({
          contextLabel: z.string().trim().min(1),
          id: z.string().min(1),
          isReverse: z.boolean().optional(),
          reportScaleId: z.string().optional(),
          traitScoring: z.enum(["same", "reverse", "excluded"]).optional(),
          target: z.object({
            id: z.string().trim().min(1),
            kind: z.enum(["domain", "facet"]),
          }),
          text: z.string().trim().min(1),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const labPayloadSchema = z
  .object({
    assessment: z
      .object({
        ageAccessPolicy: z.enum(["all_ages", "adult_verification_required"]),
        caption: z.string().trim().min(1),
        cardTitle: z.string().trim().min(1),
        contentVersion: z.string().min(1),
        estimatedMinutes: z.number().int().positive(),
        profiles: z
          .array(
            z
              .object({
                id: z.string().min(1),
                relationTip: z.string().trim().min(1),
                shortTitle: z.string().trim().min(1),
                smallExperiment: z.string().trim().min(1),
                strengths: z.array(z.string().trim().min(1)).min(1),
                summary: z.string().trim().min(1),
                title: z.string().trim().min(1),
                watch: z.string().trim().min(1),
              })
              .passthrough(),
          )
          .min(2),
        questions: z
          .array(
            z
              .object({
                id: z.string().min(1),
                options: z
                  .array(
                    z.object({
                      id: z.string().min(1),
                      label: z.string().trim().min(1),
                      resultId: z.string().min(1),
                    }),
                  )
                  .min(2),
                text: z.string().trim().min(1),
              })
              .passthrough(),
          )
          .min(1),
        resultLabel: z.string().trim().min(1),
        safetyNote: z.string().trim().min(1),
        sensitivity: z.enum(["S1", "S2"]),
        slug: z.string().min(1),
        title: z.string().trim().min(1),
      })
      .passthrough(),
  })
  .passthrough();

const balancePayloadSchema = z
  .object({
    pack: z
      .object({
        contentPoolVersion: z.number().int().positive(),
        defaultQuestionCount: z.union([
          z.literal(8),
          z.literal(12),
          z.literal(16),
          z.literal(20),
          z.literal(24),
        ]),
        description: z.string().trim().min(1),
        id: z.string().min(1),
        questions: z
          .array(
            z
              .object({
                audience: z.enum([
                  "all",
                  "friends",
                  "couple",
                  "family",
                  "team",
                ]),
                contentVersion: z.number().int().positive(),
                conversationValue: z.number().min(0).max(5),
                highlightPriority: z.number().min(0).max(5),
                id: z.string().min(1),
                intensity: z.enum(["light", "lively", "deep"]),
                meaningCode: z.string().trim().min(1).optional(),
                options: z.tuple([
                  z.object({
                    id: z.string().min(1),
                    text: z.string().trim().min(1),
                  }),
                  z.object({
                    id: z.string().min(1),
                    text: z.string().trim().min(1),
                  }),
                ]),
                packId: z.string().min(1),
                phase: z.enum(["familiar", "everyday", "conversation"]),
                prompt: z.string().trim().min(1),
                promptRole: z.enum([
                  "taste",
                  "standard",
                  "preference",
                  "self_behavior",
                ]),
                scored: z.boolean(),
                sensitivity: z.enum(["general", "personal", "private"]),
                subtopic: z.string().trim().min(1),
              })
              .passthrough(),
          )
          .min(1),
        resultSemantics: z.enum([
          "taste_sync",
          "relationship_standard_sync",
          "ideal_preference_similarity",
          "reciprocal_fit",
          "choice_chemistry",
          "discovery_only",
        ]),
        roundSize: z.literal(8),
        scoringTemplate: z.enum([
          "taste_sync",
          "relationship_standard",
          "ideal_preference",
          "reciprocal_fit",
          "dilemma_fun",
          "discovery_only",
        ]),
        slug: z.string().min(1),
        supportedQuestionCounts: z
          .array(
            z.union([
              z.literal(8),
              z.literal(12),
              z.literal(16),
              z.literal(20),
              z.literal(24),
            ]),
          )
          .min(1),
        title: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

const friendResultCopySchema = z.object({
  description: z.string().trim().min(1),
  title: z.string().trim().min(1),
});

const friendPayloadSchema = z
  .object({
    config: z
      .object({
        choices: z
          .array(
            z.object({
              id: z.enum(["plan", "listen"]),
              label: z.string().trim().min(1),
            }),
          )
          .length(2),
        contextLabel: z.string().trim().min(1),
        description: z.string().trim().min(1),
        invitationText: z.string().trim().min(1),
        invitationTitle: z.string().trim().min(1),
        predictionHeading: z.string().trim().min(1),
        question: z.string().trim().min(1),
        receiverHeading: z.string().trim().min(1),
        resultInsight: z.string().trim().min(1),
        resultCopies: z.object({
          bothDifferent: friendResultCopySchema,
          bothMatched: friendResultCopySchema,
          choiceOnlyMatched: friendResultCopySchema,
          predictionOnlyMatched: friendResultCopySchema,
        }),
        expiredInviteTitle: z.string().trim().min(1),
        expiredInviteDescription: z.string().trim().min(1),
        invalidInviteTitle: z.string().trim().min(1),
        invalidInviteDescription: z.string().trim().min(1),
        senderHeading: z.string().trim().min(1),
        title: z.string().trim().min(1),
      })
      .passthrough(),
  })
  .passthrough();

function issue(
  severity: AssessmentStudioValidationIssue["severity"],
  code: string,
  fieldPath: string,
  message: string,
): AssessmentStudioValidationIssue {
  return { code, fieldPath, message, severity };
}

function zodIssues(error: z.ZodError): AssessmentStudioValidationIssue[] {
  return error.issues.map((item) =>
    issue(
      "blocker",
      "invalid_structure",
      item.path.length > 0 ? item.path.join(".") : "document",
      `필수 데이터 형식을 확인해 주세요. ${item.message}`,
    ),
  );
}

function findDuplicateIds(ids: string[]) {
  const seen = new Set<string>();
  return [
    ...new Set(
      ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false))),
    ),
  ];
}

export function validateAssessmentStudioDocument(
  input: unknown,
): AssessmentStudioValidationIssue[] {
  const common = assessmentStudioDocumentSchema.safeParse(input);
  if (!common.success) return zodIssues(common.error);

  const document = common.data;
  const issues: AssessmentStudioValidationIssue[] = [];
  if (document.ageAccessPolicy === "adult_verification_required") {
    issues.push(
      issue(
        "blocker",
        "adult_verification_unavailable",
        "ageAccessPolicy",
        "성인 인증 수단과 서버 접근 차단이 운영 검증되기 전에는 19세 이상 전용 검사를 발행할 수 없어요.",
      ),
    );
  }
  if (subtypeCategory[document.subtype] !== document.category) {
    issues.push(
      issue(
        "blocker",
        "subtype_category_mismatch",
        "subtype",
        "검사 유형과 카테고리 조합이 맞지 않아요.",
      ),
    );
  }
  if (Array.from(document.caption).length > 90) {
    issues.push(
      issue(
        "warning",
        "caption_too_long",
        "caption",
        "첫 화면 한 줄 설명이 길어요. 모바일에서 한눈에 읽히도록 90자 안으로 다듬어 주세요.",
      ),
    );
  }

  if (document.category === "core") {
    const parsed = corePayloadSchema.safeParse(document.payload);
    if (!parsed.success) return [...issues, ...zodIssues(parsed.error)];
    const definition = parsed.data.definition;
    const expectedMode = document.subtype === "core_quick" ? "quick" : "full";
    const expectedSlug =
      document.subtype === "core_quick" ? "quick-core" : "full-core";
    if (document.slug !== expectedSlug) {
      issues.push(
        issue(
          "blocker",
          "core_engine_unavailable",
          "slug",
          "새 코어 검사는 먼저 채점·이어하기·결과 엔진을 개발자 릴리스로 등록해야 발행할 수 있어요.",
        ),
      );
    }
    if (definition.mode !== expectedMode) {
      issues.push(
        issue(
          "blocker",
          "core_mode_mismatch",
          "payload.definition.mode",
          "빠른/정밀 검사 유형과 실행 모드가 일치하지 않아요.",
        ),
      );
    }
    if (
      definition.title !== document.title ||
      definition.estimatedMinutes !== document.estimatedMinutes
    ) {
      issues.push(
        issue(
          "blocker",
          "core_public_copy_mismatch",
          "payload.definition",
          "기본 정보와 실제 코어 검사 화면의 제목·예상 시간이 일치해야 해요.",
        ),
      );
    }
    const allItems = [...definition.items, ...(definition.adaptiveItems ?? [])];
    const duplicates = findDuplicateIds(allItems.map((item) => item.itemId));
    if (duplicates.length > 0) {
      issues.push(
        issue(
          "blocker",
          "duplicate_item_id",
          "payload.definition.items",
          `중복 문항 ID가 있어요: ${duplicates.join(", ")}`,
        ),
      );
    }
    const domains = new Set(definition.items.map((item) => item.domainId));
    if (domains.size < 5) {
      issues.push(
        issue(
          "blocker",
          "core_domain_coverage",
          "payload.definition.items",
          "뉴앙 코드 다섯 영역을 모두 측정하는 문항이 필요해요.",
        ),
      );
    }
    if (document.subtype === "core_quick" && definition.items.length < 20) {
      issues.push(
        issue(
          "blocker",
          "quick_item_count",
          "payload.definition.items",
          "빠른 코어 검사에는 최소 20개의 기본 문항이 필요해요.",
        ),
      );
    }
    if (document.subtype === "core_precision" && definition.items.length < 50) {
      issues.push(
        issue(
          "blocker",
          "precision_item_count",
          "payload.definition.items",
          "정밀 코어 검사에는 최소 50개의 기본 문항이 필요해요.",
        ),
      );
    }
  }

  if (document.subtype === "free_topic") {
    const parsed = topicPayloadSchema.safeParse(document.payload);
    if (!parsed.success) return [...issues, ...zodIssues(parsed.error)];
    const { assessment, questions } = parsed.data;
    if (assessment.slug !== document.slug) {
      issues.push(
        issue(
          "blocker",
          "slug_mismatch",
          "payload.assessment.slug",
          "기본 정보와 주제 검사 데이터의 slug가 달라요.",
        ),
      );
    }
    if (
      assessment.title !== document.title ||
      assessment.caption !== document.caption ||
      assessment.estimatedMinutes !== document.estimatedMinutes
    ) {
      issues.push(
        issue(
          "blocker",
          "topic_public_copy_mismatch",
          "payload.assessment",
          "기본 정보와 실제 주제 검사 화면의 제목·설명·예상 시간이 일치해야 해요.",
        ),
      );
    }
    if (questions.length === 0) {
      issues.push(
        issue(
          "blocker",
          "empty_question_bank",
          "payload.questions",
          "발행하려면 실제 문항을 한 개 이상 등록해야 해요.",
        ),
      );
    }
    const duplicates = findDuplicateIds(
      questions.map((question) => question.id),
    );
    if (duplicates.length > 0) {
      issues.push(
        issue(
          "blocker",
          "duplicate_question_id",
          "payload.questions",
          `중복 문항 ID가 있어요: ${duplicates.join(", ")}`,
        ),
      );
    }
    const scaleIds = new Set(
      assessment.reportScales?.map((scale) => scale.id) ?? [],
    );
    const validDomainIds = new Set(
      coreDomainDefinitions.map((item) => item.domainId),
    );
    const validFacetIds = new Set(
      coreFacetDefinitions.map((item) => item.facetId),
    );
    for (const question of questions) {
      const validTarget =
        question.target.kind === "domain"
          ? validDomainIds.has(question.target.id)
          : validFacetIds.has(question.target.id);
      if (!validTarget) {
        issues.push(
          issue(
            "blocker",
            "invalid_trait_target",
            `payload.questions.${question.id}.target`,
            "문항을 실제 뉴앙 성향 영역 또는 세부 성향과 연결해 주세요.",
          ),
        );
      }
      if (
        question.traitScoring &&
        question.traitScoring !== "excluded" &&
        !isRepresentativeTraitTarget(question.target)
      ) {
        issues.push(
          issue(
            "blocker",
            "non_representative_code_target",
            `payload.questions.${question.id}.traitScoring`,
            "이 세부 성향은 결과 리포트 전용이에요. 뉴앙코드 반영 방향을 ‘결과 리포트에만 사용’으로 바꾸거나, 코드에 연결되는 성향을 선택해 주세요.",
          ),
        );
      }
      if (scaleIds.size > 0 && !question.reportScaleId) {
        issues.push(
          issue(
            "blocker",
            "missing_question_report_scale",
            `payload.questions.${question.id}.reportScaleId`,
            "이 결과 방식에서는 모든 문항을 결과 척도와 연결해야 해요.",
          ),
        );
      }
    }
    const missingScale = questions.find(
      (question) =>
        question.reportScaleId && !scaleIds.has(question.reportScaleId),
    );
    if (missingScale) {
      issues.push(
        issue(
          "blocker",
          "missing_report_scale",
          `payload.questions.${missingScale.id}.reportScaleId`,
          "문항이 존재하지 않는 결과 척도를 가리키고 있어요.",
        ),
      );
    }
    if (
      questions.length > 0 &&
      questions.every(
        (question) =>
          resolveFreeTopicTraitRule(document.slug, question).scoring ===
          "excluded",
      )
    ) {
      issues.push(
        issue(
          "warning",
          "topic_has_no_code_evidence",
          "payload.questions",
          "모든 문항이 결과 리포트 전용입니다. 이 검사는 현재 뉴앙코드를 더 구체적으로 만드는 데 반영되지 않아요.",
        ),
      );
    }
  }

  if (document.subtype === "odd_lab") {
    const parsed = labPayloadSchema.safeParse(document.payload);
    if (!parsed.success) return [...issues, ...zodIssues(parsed.error)];
    const { assessment } = parsed.data;
    if (
      assessment.slug !== document.slug ||
      assessment.cardTitle !== document.title ||
      assessment.caption !== document.caption ||
      assessment.estimatedMinutes !== document.estimatedMinutes ||
      assessment.safetyNote !== document.description
    ) {
      issues.push(
        issue(
          "blocker",
          "lab_public_copy_mismatch",
          "payload.assessment",
          "기본 정보와 실제 별난 연구 화면의 제목·설명·예상 시간이 일치해야 해요.",
        ),
      );
    }
    const profileIds = new Set(
      assessment.profiles.map((profile) => profile.id),
    );
    const unreachable = new Set(profileIds);
    for (const question of assessment.questions) {
      for (const option of question.options) {
        if (!profileIds.has(option.resultId)) {
          issues.push(
            issue(
              "blocker",
              "missing_lab_profile",
              `payload.assessment.questions.${question.id}`,
              `보기 ${option.id}가 존재하지 않는 결과 유형을 가리켜요.`,
            ),
          );
        }
        unreachable.delete(option.resultId);
      }
    }
    if (unreachable.size > 0) {
      issues.push(
        issue(
          "blocker",
          "unreachable_lab_profile",
          "payload.assessment.profiles",
          `어떤 보기에서도 도달할 수 없는 결과가 있어요: ${[...unreachable].join(", ")}`,
        ),
      );
    }
  }

  if (document.subtype === "balance_pack") {
    const parsed = balancePayloadSchema.safeParse(document.payload);
    if (!parsed.success) return [...issues, ...zodIssues(parsed.error)];
    const expectedSemantics = {
      dilemma_fun: "choice_chemistry",
      discovery_only: "discovery_only",
      ideal_preference: "ideal_preference_similarity",
      reciprocal_fit: "reciprocal_fit",
      relationship_standard: "relationship_standard_sync",
      taste_sync: "taste_sync",
    } as const;
    if (
      parsed.data.pack.resultSemantics !==
      expectedSemantics[parsed.data.pack.scoringTemplate]
    ) {
      issues.push(
        issue(
          "blocker",
          "balance_semantics_mismatch",
          "payload.pack.resultSemantics",
          "궁합 계산 방식과 결과 해석 기준이 일치해야 해요.",
        ),
      );
    }
    if (
      ["reciprocal_fit", "discovery_only"].includes(
        parsed.data.pack.scoringTemplate,
      )
    ) {
      issues.push(
        issue(
          "blocker",
          "balance_group_engine_unavailable",
          "payload.pack.scoringTemplate",
          "현재 2~8명 그룹 결과까지 지원하는 궁합 계산 방식을 선택해 주세요.",
        ),
      );
    }
    if (
      parsed.data.pack.id !== document.slug ||
      parsed.data.pack.slug !== document.slug ||
      parsed.data.pack.title !== document.title ||
      parsed.data.pack.description !== document.description
    ) {
      issues.push(
        issue(
          "blocker",
          "balance_public_copy_mismatch",
          "payload.pack",
          "기본 정보와 실제 밸런스 게임 화면의 제목과 설명이 일치해야 해요.",
        ),
      );
    }
    for (const balanceIssue of validateBalancePack(
      parsed.data.pack as BalancePack,
    )) {
      const severity =
        balanceIssue.code === "prompt_too_long" ||
        balanceIssue.code === "option_too_long"
          ? "warning"
          : "blocker";
      issues.push(
        issue(
          severity,
          `balance_${balanceIssue.code}`,
          balanceIssue.questionId
            ? `payload.pack.questions.${balanceIssue.questionId}`
            : "payload.pack",
          balanceIssue.message,
        ),
      );
    }
  }

  if (document.subtype === "friend_match") {
    const parsed = friendPayloadSchema.safeParse(document.payload);
    if (!parsed.success) return [...issues, ...zodIssues(parsed.error)];
    if (
      parsed.data.config.title !== document.title ||
      parsed.data.config.description !== document.description
    ) {
      issues.push(
        issue(
          "blocker",
          "friend_public_copy_mismatch",
          "payload.config",
          "기본 정보와 실제 친구 게임 화면의 제목과 설명이 일치해야 해요.",
        ),
      );
    }
    const ids = parsed.data.config.choices.map((choice) => choice.id).sort();
    if (ids.join(",") !== "listen,plan") {
      issues.push(
        issue(
          "blocker",
          "friend_choice_contract",
          "payload.config.choices",
          "기존 초대 링크를 보호하기 위해 선택지 ID는 plan과 listen을 유지해야 해요.",
        ),
      );
    }
  }

  return issues;
}

export function hasAssessmentStudioBlockers(
  issues: readonly AssessmentStudioValidationIssue[],
) {
  return issues.some((item) => item.severity === "blocker");
}
