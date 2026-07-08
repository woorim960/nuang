import type {
  CoreScoreResult,
  DomainScore,
  FacetScore,
  ItemResponse,
  ResponseValue,
  ScoringItem,
  ScoringRelease,
  ScoreStatus,
} from "@/lib/scoring/types";

const responseScoreMap: Record<ResponseValue, number> = {
  1: 0,
  2: 25,
  3: 50,
  4: 75,
  5: 100,
};

export function scoreResponse(value: ResponseValue, isReverse: boolean) {
  const score = responseScoreMap[value];
  return isReverse ? 100 - score : score;
}

export function calculateCoreScore(
  release: ScoringRelease,
  responses: ItemResponse[],
): CoreScoreResult {
  const responseByItem = new Map(responses.map((item) => [item.itemId, item]));
  const itemsByFacet = groupItemsByFacet(release.items);
  const facets = release.facets.map((facet): FacetScore => {
    const itemScores = (itemsByFacet.get(facet.facetId) ?? [])
      .map((item) => scoreItem(item, responseByItem.get(item.itemId)))
      .filter((score): score is number => score !== null);

    const status: ScoreStatus =
      itemScores.length >= facet.minValidResponses ? "valid" : "insufficient";

    return {
      facetId: facet.facetId,
      label: facet.label,
      score: itemScores.length > 0 ? mean(itemScores) : null,
      validResponses: itemScores.length,
      status,
    };
  });

  const facetById = new Map(facets.map((facet) => [facet.facetId, facet]));
  const domains = release.domains.map((domain): DomainScore => {
    const pair = domain.facetIds.map((facetId) => facetById.get(facetId));
    const validScores = pair
      .filter((facet): facet is FacetScore => Boolean(facet))
      .filter((facet) => facet.status === "valid" && facet.score !== null)
      .map((facet) => facet.score as number);

    const status: ScoreStatus =
      validScores.length === 2
        ? "valid"
        : validScores.length === 1
          ? "partial"
          : "insufficient";

    const score = validScores.length > 0 ? mean(validScores) : null;
    const symbol =
      score === null ? null : score >= 50 ? domain.highSymbol : domain.lowSymbol;

    return {
      domainId: domain.domainId,
      label: domain.label,
      score,
      symbol,
      isBoundary: score !== null && score >= 45 && score <= 55,
      status,
    };
  });

  const code = domains.every((domain) => domain.symbol)
    ? domains.map((domain) => domain.symbol).join("")
    : null;

  return {
    facets,
    domains,
    code,
    profileName: code ? (release.profileNames[code] ?? null) : null,
    alternativeCodes: code ? buildAlternativeCodes(code, domains, release) : [],
  };
}

function scoreItem(item: ScoringItem, response: ItemResponse | undefined) {
  if (!response || response.isUnsure || response.value === undefined) {
    return null;
  }

  return scoreResponse(response.value, item.isReverse);
}

function groupItemsByFacet(items: ScoringItem[]) {
  return items.reduce((map, item) => {
    const existing = map.get(item.facetId) ?? [];
    map.set(item.facetId, [...existing, item]);
    return map;
  }, new Map<string, ScoringItem[]>());
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildAlternativeCodes(
  code: string,
  domains: DomainScore[],
  release: ScoringRelease,
) {
  return domains
    .flatMap((domain, index) => {
      if (!domain.isBoundary) return [];

      const domainDefinition = release.domains[index];
      const nextSymbol =
        code[index] === domainDefinition.highSymbol
          ? domainDefinition.lowSymbol
          : domainDefinition.highSymbol;
      return `${code.slice(0, index)}${nextSymbol}${code.slice(index + 1)}`;
    })
    .filter((alternativeCode, index, list) => list.indexOf(alternativeCode) === index);
}
