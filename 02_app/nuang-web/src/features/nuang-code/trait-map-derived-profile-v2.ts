import { z } from "zod";
import {
  traitMapClaimV2Schema,
  traitMapWhyLenses,
} from "@/features/nuang-code/trait-map-data-center-v2";
import { nuangCodeSchema } from "@/features/nuang-code/trait-map-knowledge-contract";

const derivationModeSchema = z.enum(["inherited", "axis_override"]);
const changedAxisSchema = z.enum(traitMapWhyLenses);

export const traitMapDerivedClaimLineageV2Schema = z.object({
  claimId: z.string().min(1),
  sourceClaimId: z.string().min(1),
  derivationMode: derivationModeSchema,
  changedAxis: changedAxisSchema,
  rationale: z.string().min(1),
});

export const traitMapDerivedProfilePacketV2Schema = z
  .object({
    contractVersion: z.literal("nuang-trait-map-data-center.v2"),
    packetId: z.string().min(1),
    status: z.literal("RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION"),
    code: nuangCodeSchema,
    roleName: z.string().min(1),
    baseAnchor: nuangCodeSchema,
    changedAxis: changedAxisSchema,
    changedLetters: z.string().regex(/^[A-Z]\/[A-Z]$/),
    summary: z.object({
      scenarioCount: z.number().int().positive(),
      claimCount: z.number().int().positive(),
      inheritedClaimCount: z.number().int().nonnegative(),
      axisOverrideClaimCount: z.number().int().positive(),
      customerVisibleClaims: z.literal(0),
    }),
    validationQueue: z.array(
      z.object({
        scenarioId: z.string().regex(/^SCN-/),
        derivationMode: derivationModeSchema,
        reviewFocus: z.array(z.string().min(1)).min(1),
        status: z.literal("cognitive_review_required"),
      }),
    ),
    claims: z.array(traitMapClaimV2Schema).min(1),
    lineage: z.array(traitMapDerivedClaimLineageV2Schema).min(1),
  })
  .superRefine((packet, context) => {
    const claimIds = packet.claims.map((claim) => claim.claimId);
    const lineageClaimIds = packet.lineage.map((item) => item.claimId);
    const scenarioIds = new Set(
      packet.claims.flatMap((claim) => claim.scenarioRefs),
    );
    const inheritedCount = packet.lineage.filter(
      (item) => item.derivationMode === "inherited",
    ).length;
    const overrideCount = packet.lineage.filter(
      (item) => item.derivationMode === "axis_override",
    ).length;

    if (new Set(claimIds).size !== claimIds.length) {
      context.addIssue({
        code: "custom",
        message: "파생 claim ID는 서로 달라야 해요.",
        path: ["claims"],
      });
    }
    if (
      new Set(lineageClaimIds).size !== lineageClaimIds.length ||
      new Set(claimIds).size !== new Set(lineageClaimIds).size ||
      claimIds.some((claimId) => !lineageClaimIds.includes(claimId))
    ) {
      context.addIssue({
        code: "custom",
        message: "모든 파생 claim에는 정확히 하나의 계보 기록이 필요해요.",
        path: ["lineage"],
      });
    }
    if (
      packet.claims.some(
        (claim) =>
          claim.entity.kind !== "profile" ||
          claim.entity.ref !== packet.code ||
          !claim.claimId.startsWith(`${packet.code}.`),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "파생 claim의 ID와 대상 성향은 패킷 코드와 같아야 해요.",
        path: ["claims"],
      });
    }
    if (
      packet.lineage.some(
        (item) =>
          !item.sourceClaimId.startsWith(`${packet.baseAnchor}.`) ||
          item.changedAxis !== packet.changedAxis,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "계보에는 기준 성향 claim과 변경 축을 정확히 기록해야 해요.",
        path: ["lineage"],
      });
    }
    if (
      packet.summary.claimCount !== packet.claims.length ||
      packet.summary.claimCount !== packet.lineage.length ||
      packet.summary.inheritedClaimCount !== inheritedCount ||
      packet.summary.axisOverrideClaimCount !== overrideCount ||
      packet.summary.scenarioCount !== scenarioIds.size
    ) {
      context.addIssue({
        code: "custom",
        message: "파생 패킷 요약 수치가 실제 데이터와 일치해야 해요.",
        path: ["summary"],
      });
    }
  });

export type TraitMapDerivedProfilePacketV2 = z.infer<
  typeof traitMapDerivedProfilePacketV2Schema
>;
