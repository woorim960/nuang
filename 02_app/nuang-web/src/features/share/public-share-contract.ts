export type PublicShareUnavailableStatus = "expired" | "not_found" | "revoked";

export type PublicShareDomainSummary = {
  domainId: string;
  label: string;
  score: number | null;
  symbol: string | null;
};

export type PublicShareSuccessInput = {
  completedAt: string;
  domains: PublicShareDomainSummary[];
  profileCode: string;
  profileName: string;
  resultLabel: string;
};

export const publicShareMaxDomainCount = 5;

export const publicShareUnavailableStates: Record<
  PublicShareUnavailableStatus,
  {
    httpStatus: 404 | 410;
    message: string;
  }
> = {
  expired: {
    httpStatus: 410,
    message: "만료된 공유 링크예요.",
  },
  not_found: {
    httpStatus: 404,
    message: "공유 결과를 찾을 수 없어요.",
  },
  revoked: {
    httpStatus: 410,
    message: "철회된 공유 링크예요.",
  },
};

export function createPublicShareSuccessPayload(input: PublicShareSuccessInput) {
  return {
    ok: true,
    share: {
      status: "active",
      result: {
        completedAt: input.completedAt,
        domains: input.domains.slice(0, publicShareMaxDomainCount).map((domain) => ({
          domainId: domain.domainId,
          label: domain.label,
          score: domain.score,
          symbol: domain.symbol,
        })),
        profileCode: input.profileCode,
        profileName: input.profileName,
        resultLabel: input.resultLabel,
      },
      visibility: "summary",
    },
    privacy: {
      includesDirectResponses: false,
      includesFacetScores: false,
      includesRawScorePayload: false,
    },
  } as const;
}

export function createPublicShareUnavailablePayload(
  status: PublicShareUnavailableStatus,
) {
  const state = publicShareUnavailableStates[status];

  return {
    ok: false,
    error: "share_unavailable",
    message: state.message,
    status,
  } as const;
}
