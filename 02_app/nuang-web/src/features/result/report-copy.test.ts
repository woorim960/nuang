import { describe, expect, it } from "vitest";
import coreResultCopySeed from "../../../content-seed/reports/core-result-copy.v0.1.json";
import {
  coreResultCopyVersion,
  getDomainNarrative,
  getFacetInsight,
} from "@/features/result/report-copy";
import type { DomainScore, FacetScore } from "@/lib/scoring/types";

describe("core result copy", () => {
  it("uses the current result copy seed version", () => {
    expect(coreResultCopySeed.content_version).toBe(coreResultCopyVersion);
    expect(coreResultCopySeed.policy.clinical_use).toBe(false);
    expect(coreResultCopySeed.policy.ranking_enabled).toBe(false);
    expect(coreResultCopySeed.policy.percentile_enabled).toBe(false);
    expect(coreResultCopySeed.policy.relationship_success_prediction).toBe(false);
    expect(coreResultCopySeed.policy.employment_or_finance_use).toBe(false);
    expect(coreResultCopySeed.policy.paid_accuracy_unlock).toBe(false);
    expect(coreResultCopySeed.policy.server_upload_required).toBe(false);
  });

  it("matches domain narrative output to the seed copy", () => {
    expect(coreResultCopySeed.domains).toHaveLength(5);

    coreResultCopySeed.domains.forEach((seedDomain) => {
      const high = getDomainNarrative(
        buildDomainScore(seedDomain.domain_id, seedDomain.label, 80),
      );
      const low = getDomainNarrative(
        buildDomainScore(seedDomain.domain_id, seedDomain.label, 20),
      );
      const middle = getDomainNarrative(
        buildDomainScore(seedDomain.domain_id, seedDomain.label, 50),
      );
      const missing = getDomainNarrative(
        buildDomainScore(seedDomain.domain_id, seedDomain.label, null),
      );

      expect({
        action: high.action,
        relation: high.relation,
        strengths: high.strengths,
        summary: high.summary,
        title: high.title,
        watch: high.watch,
      }).toEqual(seedDomain.high);

      expect({
        action: low.action,
        relation: low.relation,
        strengths: low.strengths,
        summary: low.summary,
        title: low.title,
        watch: low.watch,
      }).toEqual(seedDomain.low);

      expect(middle.title).toBe(buildMiddleTitle(seedDomain.label));
      expect(middle.summary).toBe(seedDomain.middle_summary);
      expect(middle.strengths).toEqual(coreResultCopySeed.global_copy.middle.strengths);
      expect(middle.watch).toBe(coreResultCopySeed.global_copy.middle.watch);
      expect(middle.relation).toBe(coreResultCopySeed.global_copy.middle.relation);
      expect(middle.action).toBe(coreResultCopySeed.global_copy.middle.action);

      expect(missing.title).toBe(seedDomain.label);
      expect(missing.summary).toBe(coreResultCopySeed.global_copy.missing.summary);
      expect(missing.strengths).toEqual([]);
      expect(missing.watch).toBe(coreResultCopySeed.global_copy.missing.watch);
      expect(missing.relation).toBe(coreResultCopySeed.global_copy.missing.relation);
      expect(missing.action).toBe(coreResultCopySeed.global_copy.missing.action);
    });
  });

  it("matches facet insight output to the seed copy", () => {
    expect(coreResultCopySeed.facets).toHaveLength(10);

    coreResultCopySeed.facets.forEach((seedFacet) => {
      expect(getFacetInsight(buildFacetScore(seedFacet.facet_id, 80))).toBe(
        seedFacet.high,
      );
      expect(getFacetInsight(buildFacetScore(seedFacet.facet_id, 20))).toBe(
        seedFacet.low,
      );
      expect(getFacetInsight(buildFacetScore(seedFacet.facet_id, 50))).toBe(
        coreResultCopySeed.global_copy.middle.facet,
      );
      expect(getFacetInsight(buildFacetScore(seedFacet.facet_id, null))).toBe(
        coreResultCopySeed.global_copy.missing.facet,
      );
    });
  });

  it("uses natural Korean topic particles in middle domain titles", () => {
    expect(
      getDomainNarrative(buildDomainScore("SE", "사람 사이 에너지", 50)).title,
    ).toBe("사람 사이 에너지는 균형 구간에 가까워요");
    expect(
      getDomainNarrative(buildDomainScore("OE", "감각과 생각", 50)).title,
    ).toBe("감각과 생각은 균형 구간에 가까워요");
  });

  it("keeps core result copy inside provisional QA rules", () => {
    const copyText = [
      ...coreResultCopySeed.domains.flatMap((domain) => [
        domain.middle_summary,
        domain.high.title,
        domain.high.summary,
        ...domain.high.strengths,
        domain.high.watch,
        domain.high.relation,
        domain.high.action,
        domain.low.title,
        domain.low.summary,
        ...domain.low.strengths,
        domain.low.watch,
        domain.low.relation,
        domain.low.action,
      ]),
      ...coreResultCopySeed.facets.flatMap((facet) => [facet.high, facet.low]),
    ].join(" ");

    coreResultCopySeed.qa_rules.forbidden_interpretation_terms.forEach((term) => {
      expect(copyText).not.toContain(term);
    });

    coreResultCopySeed.domains.forEach((domain) => {
      expect(domain.high.strengths).toHaveLength(
        coreResultCopySeed.qa_rules.domain_strength_count,
      );
      expect(domain.low.strengths).toHaveLength(
        coreResultCopySeed.qa_rules.domain_strength_count,
      );
      expect(domain.high.title.endsWith("형")).toBe(false);
      expect(domain.low.title.endsWith("형")).toBe(false);
      expect(domain.high.summary.length).toBeGreaterThanOrEqual(40);
      expect(domain.low.summary.length).toBeGreaterThanOrEqual(40);
      expect(domain.middle_summary.length).toBeGreaterThanOrEqual(30);
    });
  });
});

function buildDomainScore(
  domainId: string,
  label: string,
  score: number | null,
): DomainScore {
  return {
    domainId,
    isBoundary: score !== null && score >= 45 && score <= 55,
    label,
    score,
    status: score === null ? "insufficient" : "valid",
    symbol: score === null ? null : score >= 50 ? "H" : "L",
  };
}

function buildFacetScore(facetId: string, score: number | null): FacetScore {
  return {
    facetId,
    label: facetId,
    score,
    status: score === null ? "insufficient" : "valid",
    validResponses: score === null ? 0 : 6,
  };
}

function buildMiddleTitle(label: string) {
  const lastCodePoint = label.codePointAt(label.length - 1);

  if (!lastCodePoint) return `${label}은 균형 구간에 가까워요`;

  const hangulOffset = lastCodePoint - 0xac00;
  const isHangulSyllable = hangulOffset >= 0 && hangulOffset <= 11171;
  const particle = isHangulSyllable && hangulOffset % 28 === 0 ? "는" : "은";

  return `${label}${particle} 균형 구간에 가까워요`;
}
