export const nextNuangCodeSchemeVersion = "NUANG-CODE-5AXIS-CANDIDATE-1.0";

export type MeasurementGateStatus = "failed" | "not_started" | "passed";

export type CandidateCodePosition = {
  codePosition: number;
  domainId: "ER" | "OE" | "RO" | "SE" | "SM";
  highSymbol: string;
  label: string;
  lowSymbol: string;
  publicFacetIds: readonly string[];
  researchDetailFacetIds: readonly string[];
};

export type CandidateCodeScheme = {
  positions: readonly CandidateCodePosition[];
  status: "candidate" | "validated" | "active" | "retired";
  validationGates: {
    cognitiveReview: MeasurementGateStatus;
    fairnessAndInvariance: MeasurementGateStatus;
    quantitativePilot: MeasurementGateStatus;
    reliabilityAndStructure: MeasurementGateStatus;
  };
  version: string;
};

export const nextNuangCodeScheme = {
  version: nextNuangCodeSchemeVersion,
  status: "candidate",
  validationGates: {
    cognitiveReview: "not_started",
    fairnessAndInvariance: "not_started",
    quantitativePilot: "not_started",
    reliabilityAndStructure: "not_started",
  },
  positions: [
    {
      codePosition: 1,
      domainId: "SE",
      label: "사람 사이 에너지",
      lowSymbol: "I",
      highSymbol: "E",
      publicFacetIds: ["SE-RE", "SE-AI"],
      researchDetailFacetIds: [],
    },
    {
      codePosition: 2,
      domainId: "OE",
      label: "생각과 탐색",
      lowSymbol: "R",
      highSymbol: "N",
      publicFacetIds: ["OE-AE", "OE-CI", "OE-IE"],
      researchDetailFacetIds: [],
    },
    {
      codePosition: 3,
      domainId: "RO",
      label: "관계에서 관심이 가는 곳",
      lowSymbol: "G",
      highSymbol: "A",
      publicFacetIds: ["RO-EC"],
      researchDetailFacetIds: ["RO-RN"],
    },
    {
      codePosition: 4,
      domainId: "SM",
      label: "일상을 꾸리는 방식",
      lowSymbol: "M",
      highSymbol: "K",
      publicFacetIds: ["SM-EP", "SM-OS"],
      researchDetailFacetIds: ["SM-RL"],
    },
    {
      codePosition: 5,
      domainId: "ER",
      label: "걱정과 감정 반응",
      lowSymbol: "C",
      highSymbol: "Q",
      publicFacetIds: ["ER-IR", "ER-WD"],
      researchDetailFacetIds: [],
    },
  ],
} as const satisfies CandidateCodeScheme;

export function canActivateCodeScheme(scheme: CandidateCodeScheme) {
  return (
    scheme.status === "validated" &&
    Object.values(scheme.validationGates).every((status) => status === "passed")
  );
}

export function assertCodeSchemeCanActivate(scheme: CandidateCodeScheme) {
  if (!canActivateCodeScheme(scheme)) {
    throw new Error(
      `Code scheme ${scheme.version} has not passed every measurement gate.`,
    );
  }
}
