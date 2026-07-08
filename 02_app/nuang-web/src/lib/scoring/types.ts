export type ResponseValue = 1 | 2 | 3 | 4 | 5;

export type ItemResponse = {
  itemId: string;
  value?: ResponseValue;
  isUnsure?: boolean;
};

export type ScoringItem = {
  itemId: string;
  facetId: string;
  isReverse: boolean;
};

export type FacetDefinition = {
  facetId: string;
  label: string;
  minValidResponses: number;
};

export type DomainDefinition = {
  domainId: string;
  label: string;
  lowSymbol: string;
  highSymbol: string;
  facetIds: [string, string];
};

export type ScoringRelease = {
  items: ScoringItem[];
  facets: FacetDefinition[];
  domains: DomainDefinition[];
  profileNames: Record<string, string>;
};

export type ScoreStatus = "valid" | "partial" | "insufficient";

export type FacetScore = {
  facetId: string;
  label: string;
  score: number | null;
  validResponses: number;
  status: ScoreStatus;
};

export type DomainScore = {
  domainId: string;
  label: string;
  score: number | null;
  symbol: string | null;
  isBoundary: boolean;
  status: ScoreStatus;
};

export type CoreScoreResult = {
  facets: FacetScore[];
  domains: DomainScore[];
  code: string | null;
  profileName: string | null;
  alternativeCodes: string[];
};
